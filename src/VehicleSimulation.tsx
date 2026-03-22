import { useEffect, useRef, useState, useCallback } from "react";

type VehicleType = "truck" | "car" | "motorcycle" | "bicycle";
type Direction = 1 | -1;

// ─── Lane layout ──────────────────────────────────────────────────────────────
const CANVAS_H = 380;
const ROAD_TOP = 48;
const ROAD_BOT = 332;
const CENTER_Y = (ROAD_TOP + ROAD_BOT) / 2; // 190

const LANES: { y: number; dir: Direction }[] = [
  { y: 93,  dir: -1 }, // 0 — left fast
  { y: 157, dir: -1 }, // 1 — left slow
  { y: 225, dir:  1 }, // 2 — right slow
  { y: 290, dir:  1 }, // 3 — right fast
];

// ─── Vehicle specs ────────────────────────────────────────────────────────────
interface VehicleDef {
  w: number; h: number;
  minSpeed: number; maxSpeed: number;
  accel: number; decel: number;
  gap: number; // minimum safe gap in px
  colors: string[];
  label: string;
}

const DEFS: Record<VehicleType, VehicleDef> = {
  truck: {
    w: 80, h: 28,
    minSpeed: 0.7, maxSpeed: 1.6,
    accel: 0.008, decel: 0.014,
    gap: 130,
    colors: ["#e67e22", "#d35400", "#95a5a6", "#7f8c8d", "#c0392b"],
    label: "Truck",
  },
  car: {
    w: 44, h: 20,
    minSpeed: 1.2, maxSpeed: 3.4,
    accel: 0.045, decel: 0.07,
    gap: 65,
    colors: ["#3498db", "#2ecc71", "#e74c3c", "#9b59b6", "#f1c40f", "#1abc9c", "#e91e63"],
    label: "Car",
  },
  motorcycle: {
    w: 32, h: 13,
    minSpeed: 2.0, maxSpeed: 5.0,
    accel: 0.09, decel: 0.14,
    gap: 48,
    colors: ["#2c3e50", "#c0392b", "#16a085", "#f39c12"],
    label: "Motorcycle",
  },
  bicycle: {
    w: 28, h: 11,
    minSpeed: 0.25, maxSpeed: 1.0,
    accel: 0.012, decel: 0.02,
    gap: 38,
    colors: ["#e74c3c", "#3498db", "#2ecc71", "#f39c12", "#9b59b6"],
    label: "Bicycle",
  },
};

// ─── Vehicle state ─────────────────────────────────────────────────────────────
interface Vehicle {
  id: number;
  type: VehicleType;
  x: number;
  lane: number;
  speed: number;       // current speed (px/frame, always ≥ 0)
  targetSpeed: number;
  color: string;
  wheelAngle: number;  // radians, for spinning wheels
  wobble: number;      // current y-offset (bicycle sway)
  wobblePhase: number;
  speedTimer: number;  // frames until next random speed change
  // smooth lane change
  laneChanging: boolean;
  fromY: number;
  toY: number;
  laneChangeProg: number; // 0–1
}

let _nextId = 1;

function randomSpeed(def: VehicleDef) {
  return def.minSpeed + Math.random() * (def.maxSpeed - def.minSpeed);
}

function spawnVehicle(type: VehicleType, laneIdx: number, cw: number): Vehicle {
  const def = DEFS[type];
  const lane = LANES[laneIdx]!;
  const x = lane.dir === 1 ? -def.w / 2 - 20 : cw + def.w / 2 + 20;
  const speed = randomSpeed(def);
  return {
    id: _nextId++,
    type, lane: laneIdx, x, speed,
    targetSpeed: speed,
    color: def.colors[Math.floor(Math.random() * def.colors.length)]!,
    wheelAngle: 0,
    wobble: 0,
    wobblePhase: Math.random() * Math.PI * 2,
    speedTimer: 180 + Math.floor(Math.random() * 240),
    laneChanging: false,
    fromY: lane.y, toY: lane.y, laneChangeProg: 1,
  };
}

// ─── Drawing helpers ──────────────────────────────────────────────────────────
function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

function darken(hex: string, amount: number) {
  const { r, g, b } = hexToRgb(hex);
  const d = (v: number) => Math.max(0, Math.round(v * (1 - amount)));
  return `rgb(${d(r)},${d(g)},${d(b)})`;
}

function lighten(hex: string, amount: number) {
  const { r, g, b } = hexToRgb(hex);
  const l = (v: number) => Math.min(255, Math.round(v + (255 - v) * amount));
  return `rgb(${l(r)},${l(g)},${l(b)})`;
}

// All draw functions assume ctx is already translated to vehicle center
// and scaled -1 for left-going vehicles (so they always face right in local space).

function drawTruck(ctx: CanvasRenderingContext2D, color: string) {
  const W = 80, H = 28;
  const hw = W / 2, hh = H / 2;

  // Trailer body
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(-hw, -hh, W * 0.62, H, 3);
  ctx.fill();

  // Trailer stripe
  ctx.fillStyle = darken(color, 0.25);
  ctx.fillRect(-hw + 4, -hh + 5, W * 0.58, 3);
  ctx.fillRect(-hw + 4, hh - 8, W * 0.58, 3);

  // Cab
  const cabX = -hw + W * 0.62;
  ctx.fillStyle = darken(color, 0.15);
  ctx.beginPath();
  ctx.roundRect(cabX, -hh, W * 0.38, H, [0, 4, 4, 0]);
  ctx.fill();

  // Windshield
  ctx.fillStyle = "rgba(168,216,234,0.75)";
  ctx.beginPath();
  ctx.roundRect(cabX + W * 0.08, -hh + 4, W * 0.24, H - 10, 2);
  ctx.fill();

  // Exhaust stack
  ctx.fillStyle = "#555";
  ctx.fillRect(cabX + W * 0.01, -hh - 5, 4, 7);

  // Wheels (4 small rects)
  ctx.fillStyle = "#1a1a1a";
  const wheelW = 9, wheelH = 6;
  ([[-hw + 6, -hh - 2], [-hw + 6, hh - 4], [-hw + W * 0.4, -hh - 2], [-hw + W * 0.4, hh - 4]] as [number, number][]).forEach(([wx, wy]) => {
    ctx.fillRect(wx, wy, wheelW, wheelH);
  });
}

function drawCar(ctx: CanvasRenderingContext2D, color: string) {
  const W = 44, H = 20;
  const hw = W / 2, hh = H / 2;

  // Body
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(-hw, -hh, W, H, 5);
  ctx.fill();

  // Roof (narrower)
  ctx.fillStyle = darken(color, 0.2);
  ctx.beginPath();
  ctx.roundRect(-hw + 8, -hh - 4, W - 16, H * 0.6, 4);
  ctx.fill();

  // Front windshield
  ctx.fillStyle = "rgba(168,216,234,0.8)";
  ctx.beginPath();
  ctx.roundRect(-hw + 9, -hh - 3, (W - 18) * 0.48, H * 0.52, 2);
  ctx.fill();

  // Rear windshield
  ctx.fillStyle = "rgba(168,216,234,0.65)";
  ctx.beginPath();
  ctx.roundRect(-hw + 9 + (W - 18) * 0.52, -hh - 3, (W - 18) * 0.48, H * 0.52, 2);
  ctx.fill();

  // Headlights
  ctx.fillStyle = "#fffde7";
  ctx.fillRect(hw - 5, -5, 3, 3);
  ctx.fillRect(hw - 5,  2, 3, 3);

  // Taillights
  ctx.fillStyle = "#e74c3c";
  ctx.fillRect(-hw + 2, -5, 3, 3);
  ctx.fillRect(-hw + 2,  2, 3, 3);

  // Wheels
  ctx.fillStyle = "#1a1a1a";
  ctx.fillRect(-hw + 3, -hh - 2, 8, 4);
  ctx.fillRect(-hw + 3,  hh - 2, 8, 4);
  ctx.fillRect( hw - 11, -hh - 2, 8, 4);
  ctx.fillRect( hw - 11,  hh - 2, 8, 4);
}

function drawMotorcycle(ctx: CanvasRenderingContext2D, color: string, wheelAngle: number) {
  const W = 32, H = 13;
  const hw = W / 2, hh = H / 2;

  // Body — elongated teardrop
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(0, 0, hw, hh * 0.7, 0, 0, Math.PI * 2);
  ctx.fill();

  // Tank/fairing highlight
  ctx.fillStyle = lighten(color, 0.3);
  ctx.beginPath();
  ctx.ellipse(hw * 0.1, 0, hw * 0.35, hh * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Rider (helmet viewed from above)
  ctx.fillStyle = darken(color, 0.3);
  ctx.beginPath();
  ctx.ellipse(-hw * 0.1, 0, 5, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Wheels — spinning
  ctx.strokeStyle = "#1a1a1a";
  ctx.lineWidth = 3;
  const drawWheel = (cx: number) => {
    ctx.beginPath();
    ctx.arc(cx, 0, 5, 0, Math.PI * 2);
    ctx.stroke();
    // spoke
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(wheelAngle) * 4, Math.sin(wheelAngle) * 4);
    ctx.lineTo(cx - Math.cos(wheelAngle) * 4, -Math.sin(wheelAngle) * 4);
    ctx.stroke();
  };
  drawWheel(-hw + 4);
  drawWheel(hw - 4);
}

function drawBicycle(ctx: CanvasRenderingContext2D, color: string, wheelAngle: number) {
  const hw = 14;

  // Frame
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-hw + 3, 0);
  ctx.lineTo(0, -2);
  ctx.lineTo(hw - 3, 0);
  ctx.lineTo(0, 2);
  ctx.closePath();
  ctx.stroke();

  // Rider
  ctx.fillStyle = darken(color, 0.2);
  ctx.beginPath();
  ctx.ellipse(0, 0, 5, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Wheels — spinning
  ctx.strokeStyle = "#1a1a1a";
  ctx.lineWidth = 2;
  const drawWheel = (cx: number) => {
    ctx.beginPath();
    ctx.arc(cx, 0, 5, 0, Math.PI * 2);
    ctx.stroke();
    // spoke
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(wheelAngle) * 4, Math.sin(wheelAngle) * 4);
    ctx.lineTo(cx - Math.cos(wheelAngle) * 4, -Math.sin(wheelAngle) * 4);
    ctx.stroke();
  };
  drawWheel(-hw + 3);
  drawWheel(hw - 3);
}

// ─── Road drawing ─────────────────────────────────────────────────────────────
function drawRoad(ctx: CanvasRenderingContext2D, cw: number, dashOffset: number) {
  // Grass top
  ctx.fillStyle = "#2d5a1b";
  ctx.fillRect(0, 0, cw, ROAD_TOP);

  // Road surface
  ctx.fillStyle = "#3a3a3a";
  ctx.fillRect(0, ROAD_TOP, cw, ROAD_BOT - ROAD_TOP);

  // Grass bottom
  ctx.fillStyle = "#2d5a1b";
  ctx.fillRect(0, ROAD_BOT, cw, CANVAS_H - ROAD_BOT);

  // Road edges (white)
  ctx.strokeStyle = "#e0e0e0";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, ROAD_TOP + 1); ctx.lineTo(cw, ROAD_TOP + 1);
  ctx.moveTo(0, ROAD_BOT - 1); ctx.lineTo(cw, ROAD_BOT - 1);
  ctx.stroke();

  // Center divider — double yellow
  ctx.strokeStyle = "#f0c040";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, CENTER_Y - 3); ctx.lineTo(cw, CENTER_Y - 3);
  ctx.moveTo(0, CENTER_Y + 3); ctx.lineTo(cw, CENTER_Y + 3);
  ctx.stroke();

  // Dashed lane lines (white)
  ctx.strokeStyle = "#aaaaaa";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([28, 20]);
  ctx.lineDashOffset = -dashOffset;

  const laneLineYs = [LANES[0]!.y + 30, LANES[2]!.y + 32]; // between lane 0–1 and lane 2–3
  laneLineYs.forEach(y => {
    ctx.beginPath();
    ctx.moveTo(0, y); ctx.lineTo(cw, y);
    ctx.stroke();
  });
  ctx.setLineDash([]);
}

// ─── Physics update ───────────────────────────────────────────────────────────
function tickVehicles(vehicles: Vehicle[], cw: number) {
  vehicles.forEach(v => {
    const def = DEFS[v.type];
    const dir = LANES[v.lane]!.dir;

    // Find the closest vehicle ahead in the same lane
    let minGap = Infinity;
    let aheadSpeed = Infinity;
    vehicles.forEach(other => {
      if (other.id === v.id) return;
      if (other.lane !== v.lane) return;
      const dx = (other.x - v.x) * dir; // positive = ahead
      if (dx <= 0) return;
      const gap = dx - def.w / 2 - DEFS[other.type].w / 2;
      if (gap < minGap) { minGap = gap; aheadSpeed = other.speed; }
    });

    // Adjust target speed
    let wantedSpeed = v.targetSpeed;
    if (minGap < def.gap * 1.5) {
      const fraction = Math.max(0, (minGap - def.gap * 0.4) / (def.gap * 1.1));
      wantedSpeed = Math.min(wantedSpeed, aheadSpeed * fraction + def.minSpeed * (1 - fraction));
    }
    if (minGap < def.gap * 0.5) {
      wantedSpeed = Math.max(0, aheadSpeed * 0.5);
    }

    // Smoothly approach wantedSpeed
    if (v.speed < wantedSpeed) {
      v.speed = Math.min(v.speed + def.accel, wantedSpeed);
    } else if (v.speed > wantedSpeed) {
      v.speed = Math.max(v.speed - def.decel, wantedSpeed);
    }

    // Move
    v.x += v.speed * dir;

    // Wrap around
    const halfW = def.w / 2 + 20;
    if (dir === 1 && v.x > cw + halfW) v.x = -halfW;
    if (dir === -1 && v.x < -halfW) v.x = cw + halfW;

    // Wheel rotation (circumference ≈ 2π*r; r≈5 → ~31px per full turn)
    v.wheelAngle += (v.speed / 31) * dir * Math.PI * 2;

    // Bicycle natural sway
    if (v.type === "bicycle") {
      v.wobblePhase += 0.04 + v.speed * 0.015;
      v.wobble = Math.sin(v.wobblePhase) * 1.8;
    }

    // Periodic random speed change
    v.speedTimer--;
    if (v.speedTimer <= 0) {
      v.targetSpeed = randomSpeed(def);
      v.speedTimer = 160 + Math.floor(Math.random() * 260);
    }

    // Smooth lane change animation
    if (v.laneChanging) {
      v.laneChangeProg = Math.min(1, v.laneChangeProg + 0.025);
      if (v.laneChangeProg >= 1) v.laneChanging = false;
    }
  });
}

function getVehicleY(v: Vehicle): number {
  if (!v.laneChanging) return LANES[v.lane]!.y + v.wobble;
  const t = v.laneChangeProg;
  const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  return v.fromY + (v.toY - v.fromY) * ease + v.wobble;
}

// ─── Component ────────────────────────────────────────────────────────────────
const TYPE_LABELS: { type: VehicleType; emoji: string; color: string }[] = [
  { type: "truck",      emoji: "🚚", color: "#e67e22" },
  { type: "car",        emoji: "🚗", color: "#3498db" },
  { type: "motorcycle", emoji: "🏍️", color: "#c0392b" },
  { type: "bicycle",    emoji: "🚲", color: "#2ecc71" },
];

export function VehicleSimulation() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const vehiclesRef = useRef<Vehicle[]>([]);
  const rafRef = useRef<number>(0);
  const pausedRef = useRef(false);
  const dashOffsetRef = useRef(0);

  const [paused, setPaused] = useState(false);
  const [counts, setCounts] = useState<Record<VehicleType, number>>({
    truck: 0, car: 0, motorcycle: 0, bicycle: 0,
  });

  const syncCounts = useCallback(() => {
    const c: Record<VehicleType, number> = { truck: 0, car: 0, motorcycle: 0, bicycle: 0 };
    vehiclesRef.current.forEach(v => c[v.type]++);
    setCounts({ ...c });
  }, []);

  const addVehicle = useCallback((type: VehicleType) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cw = canvas.width;
    // Pick the lane for this vehicle type that has the fewest vehicles
    const preferredLanes = type === "motorcycle"
      ? [0, 3, 1, 2]
      : type === "truck" || type === "bicycle"
        ? [1, 2, 0, 3]
        : [0, 1, 2, 3];
    const laneIdx = preferredLanes.find(i => {
      const inLane = vehiclesRef.current.filter(v => v.lane === i).length;
      return inLane < 5;
    }) ?? (Math.random() < 0.5 ? 0 : 2);
    vehiclesRef.current.push(spawnVehicle(type, laneIdx, cw));
    syncCounts();
  }, [syncCounts]);

  const removeVehicle = useCallback((type: VehicleType) => {
    const idx = vehiclesRef.current.findIndex(v => v.type === type);
    if (idx !== -1) {
      vehiclesRef.current.splice(idx, 1);
      syncCounts();
    }
  }, [syncCounts]);

  const togglePause = useCallback(() => {
    pausedRef.current = !pausedRef.current;
    setPaused(p => !p);
  }, []);

  // Seed with some initial vehicles
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cw = canvas.width;
    const initialSpawns: [VehicleType, number][] = [
      ["car", 0], ["car", 0], ["car", 1], ["car", 2], ["car", 2], ["car", 3],
      ["truck", 1], ["truck", 3],
      ["motorcycle", 0], ["motorcycle", 3],
      ["bicycle", 1], ["bicycle", 2],
    ];
    // Spread vehicles across lanes at random positions
    initialSpawns.forEach(([type, lane]) => {
      const v = spawnVehicle(type, lane, cw);
      v.x = Math.random() * cw;
      vehiclesRef.current.push(v);
    });
    syncCounts();
  }, [syncCounts]);

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    const loop = () => {
      rafRef.current = requestAnimationFrame(loop);
      const cw = canvas.width;

      if (!pausedRef.current) {
        tickVehicles(vehiclesRef.current, cw);
        dashOffsetRef.current = (dashOffsetRef.current + 1.2) % 48;
      }

      // Draw
      ctx.clearRect(0, 0, cw, CANVAS_H);
      drawRoad(ctx, cw, dashOffsetRef.current);

      // Sort by y so vehicles overlap naturally
      const sorted = [...vehiclesRef.current].sort((a, b) => getVehicleY(a) - getVehicleY(b));

      sorted.forEach(v => {
        const def = DEFS[v.type];
        const dir = LANES[v.lane]!.dir;
        const vy = getVehicleY(v);

        ctx.save();
        ctx.translate(v.x, vy);
        if (dir === -1) ctx.scale(-1, 1); // flip for left-going

        // Drop shadow
        ctx.shadowColor = "rgba(0,0,0,0.5)";
        ctx.shadowBlur = 6;
        ctx.shadowOffsetX = dir === 1 ? -2 : 2;
        ctx.shadowOffsetY = 3;

        switch (v.type) {
          case "truck":      drawTruck(ctx, v.color); break;
          case "car":        drawCar(ctx, v.color); break;
          case "motorcycle": drawMotorcycle(ctx, v.color, v.wheelAngle); break;
          case "bicycle":    drawBicycle(ctx, v.color, v.wheelAngle); break;
        }

        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        // Speed label (small, debug-style)
        ctx.scale(dir, 1); // undo flip for text
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ctx.font = "8px monospace";
        ctx.textAlign = "center";
        ctx.fillText(`${(v.speed * 60).toFixed(0)}`, 0, -def.h / 2 - 5);

        ctx.restore();
      });

      // Pause overlay
      if (pausedRef.current) {
        ctx.fillStyle = "rgba(0,0,0,0.45)";
        ctx.fillRect(0, 0, cw, CANVAS_H);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 32px system-ui";
        ctx.textAlign = "center";
        ctx.fillText("⏸  PAUSED", cw / 2, CANVAS_H / 2);
      }
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", padding: "1rem" }}>
      <h2 style={{ color: "#F9FAFB", margin: 0, fontSize: "1.25rem", fontWeight: 600 }}>
        Vehicle Traffic Simulation
      </h2>

      {/* Canvas */}
      <div style={{ position: "relative", borderRadius: "12px", overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.6)" }}>
        <canvas
          ref={canvasRef}
          width={900}
          height={CANVAS_H}
          style={{ display: "block", maxWidth: "100%" }}
        />
        {/* Lane labels */}
        <div style={{ position: "absolute", left: 8, top: 0, height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-around", pointerEvents: "none" }}>
          {[{ label: "← Fast", y: LANES[0]!.y }, { label: "← Slow", y: LANES[1]!.y }, { label: "Slow →", y: LANES[2]!.y }, { label: "Fast →", y: LANES[3]!.y }]
            .map(({ label, y }) => (
              <span key={label} style={{ position: "absolute", top: y - 7, left: 8, fontSize: "10px", color: "rgba(255,255,255,0.5)", fontFamily: "monospace" }}>
                {label}
              </span>
            ))}
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", justifyContent: "center" }}>
        {/* Pause button */}
        <button
          onClick={togglePause}
          style={{
            padding: "0.5rem 1.2rem",
            borderRadius: "8px",
            border: "none",
            background: paused ? "#3b82f6" : "#475569",
            color: "#fff",
            fontWeight: 600,
            cursor: "pointer",
            fontSize: "0.9rem",
          }}
        >
          {paused ? "▶ Resume" : "⏸ Pause"}
        </button>

        {/* Per-type add/remove */}
        {TYPE_LABELS.map(({ type, emoji, color }) => (
          <div
            key={type}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              background: "#1e293b",
              borderRadius: "10px",
              padding: "0.35rem 0.75rem",
              border: `1px solid ${color}55`,
            }}
          >
            <span style={{ fontSize: "1.1rem" }}>{emoji}</span>
            <span style={{ color: "#e2e8f0", fontSize: "0.82rem", minWidth: 60 }}>
              {DEFS[type].label} <span style={{ color, fontWeight: 700 }}>{counts[type]}</span>
            </span>
            <button
              onClick={() => removeVehicle(type)}
              disabled={counts[type] === 0}
              style={{
                width: 22, height: 22, borderRadius: "50%", border: "none",
                background: counts[type] === 0 ? "#374151" : "#ef4444",
                color: "#fff", fontWeight: 700, cursor: counts[type] === 0 ? "default" : "pointer",
                fontSize: "0.9rem", lineHeight: 1,
              }}
            >−</button>
            <button
              onClick={() => addVehicle(type)}
              disabled={counts[type] >= 12}
              style={{
                width: 22, height: 22, borderRadius: "50%", border: "none",
                background: counts[type] >= 12 ? "#374151" : "#22c55e",
                color: "#fff", fontWeight: 700, cursor: counts[type] >= 12 ? "default" : "pointer",
                fontSize: "0.9rem", lineHeight: 1,
              }}
            >+</button>
          </div>
        ))}
      </div>

      <p style={{ color: "#64748b", fontSize: "0.75rem", margin: 0, textAlign: "center" }}>
        Numbers above vehicles show speed (km/h equivalent). Vehicles slow down for traffic ahead.
      </p>
    </div>
  );
}
