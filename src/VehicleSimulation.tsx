import { useEffect, useRef, useState, useCallback } from "react";
import {
  type VehicleType, type Vehicle, type VVehicle,
  CANVAS_H, ROAD_TOP, ROAD_BOT, CENTER_Y, LANES,
  VROAD_CENTER_X, VROAD_LEFT, VROAD_RIGHT, VLANE_SOUTH_X, VLANE_NORTH_X,
  DEFS, PHASE_DURATIONS,
  hSignal, vSignal,
  spawnVehicle, spawnVVehicle, vDir, vLaneX,
  tickVehicles, tickVVehicles,
} from "./simulation";

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


// ─── Road drawing ─────────────────────────────────────────────────────────────
function drawRoad(ctx: CanvasRenderingContext2D, cw: number, dashOffset: number) {
  // Grass top-left
  ctx.fillStyle = "#2d5a1b";
  ctx.fillRect(0, 0, VROAD_LEFT, ROAD_TOP);
  // Grass top-right
  ctx.fillRect(VROAD_RIGHT, 0, cw - VROAD_RIGHT, ROAD_TOP);
  // Grass bottom-left
  ctx.fillRect(0, ROAD_BOT, VROAD_LEFT, CANVAS_H - ROAD_BOT);
  // Grass bottom-right
  ctx.fillRect(VROAD_RIGHT, ROAD_BOT, cw - VROAD_RIGHT, CANVAS_H - ROAD_BOT);

  // Horizontal road surface (left of vertical road)
  ctx.fillStyle = "#3a3a3a";
  ctx.fillRect(0, ROAD_TOP, VROAD_LEFT, ROAD_BOT - ROAD_TOP);
  // Horizontal road surface (right of vertical road)
  ctx.fillRect(VROAD_RIGHT, ROAD_TOP, cw - VROAD_RIGHT, ROAD_BOT - ROAD_TOP);

  // Vertical road surface (full canvas height)
  ctx.fillRect(VROAD_LEFT, 0, VROAD_RIGHT - VROAD_LEFT, CANVAS_H);

  // Intersection box (slightly lighter to hint at pavement wear)
  ctx.fillStyle = "#424242";
  ctx.fillRect(VROAD_LEFT, ROAD_TOP, VROAD_RIGHT - VROAD_LEFT, ROAD_BOT - ROAD_TOP);

  // ── Horizontal road markings ──────────────────────────────────────────────

  // Road edges (white) — skip over vertical road
  ctx.strokeStyle = "#e0e0e0";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, ROAD_TOP + 1);       ctx.lineTo(VROAD_LEFT, ROAD_TOP + 1);
  ctx.moveTo(VROAD_RIGHT, ROAD_TOP + 1); ctx.lineTo(cw, ROAD_TOP + 1);
  ctx.moveTo(0, ROAD_BOT - 1);       ctx.lineTo(VROAD_LEFT, ROAD_BOT - 1);
  ctx.moveTo(VROAD_RIGHT, ROAD_BOT - 1); ctx.lineTo(cw, ROAD_BOT - 1);
  ctx.stroke();

  // Center divider — double yellow (skip intersection)
  ctx.strokeStyle = "#f0c040";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, CENTER_Y - 3);       ctx.lineTo(VROAD_LEFT, CENTER_Y - 3);
  ctx.moveTo(VROAD_RIGHT, CENTER_Y - 3); ctx.lineTo(cw, CENTER_Y - 3);
  ctx.moveTo(0, CENTER_Y + 3);       ctx.lineTo(VROAD_LEFT, CENTER_Y + 3);
  ctx.moveTo(VROAD_RIGHT, CENTER_Y + 3); ctx.lineTo(cw, CENTER_Y + 3);
  ctx.stroke();

  // Dashed lane lines — horizontal (skip intersection zone)
  ctx.strokeStyle = "#aaaaaa";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([28, 20]);
  ctx.lineDashOffset = -dashOffset;
  const laneLineYs = [LANES[0]!.y + 30, LANES[2]!.y + 32, LANES[3]!.y + 32];
  laneLineYs.forEach(y => {
    ctx.beginPath();
    ctx.moveTo(0, y); ctx.lineTo(VROAD_LEFT, y);
    ctx.moveTo(VROAD_RIGHT, y); ctx.lineTo(cw, y);
    ctx.stroke();
  });
  ctx.setLineDash([]);

  // ── Vertical road markings ────────────────────────────────────────────────

  // Vertical road edges (white) — skip over horizontal road
  ctx.strokeStyle = "#e0e0e0";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(VROAD_LEFT + 1, 0);       ctx.lineTo(VROAD_LEFT + 1, ROAD_TOP);
  ctx.moveTo(VROAD_LEFT + 1, ROAD_BOT); ctx.lineTo(VROAD_LEFT + 1, CANVAS_H);
  ctx.moveTo(VROAD_RIGHT - 1, 0);       ctx.lineTo(VROAD_RIGHT - 1, ROAD_TOP);
  ctx.moveTo(VROAD_RIGHT - 1, ROAD_BOT); ctx.lineTo(VROAD_RIGHT - 1, CANVAS_H);
  ctx.stroke();

  // Vertical center divider — double yellow (skip intersection)
  ctx.strokeStyle = "#f0c040";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(VROAD_CENTER_X - 3, 0);       ctx.lineTo(VROAD_CENTER_X - 3, ROAD_TOP);
  ctx.moveTo(VROAD_CENTER_X - 3, ROAD_BOT); ctx.lineTo(VROAD_CENTER_X - 3, CANVAS_H);
  ctx.moveTo(VROAD_CENTER_X + 3, 0);       ctx.lineTo(VROAD_CENTER_X + 3, ROAD_TOP);
  ctx.moveTo(VROAD_CENTER_X + 3, ROAD_BOT); ctx.lineTo(VROAD_CENTER_X + 3, CANVAS_H);
  ctx.stroke();
}

// ─── Traffic light drawing ────────────────────────────────────────────────────
function drawOneLamp(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  signal: "green" | "yellow" | "red",
) {
  const dotR = 5;
  const gap  = 13;
  const hw = dotR + 4, hh = gap + dotR + 4;

  // Housing
  ctx.fillStyle = "#111";
  ctx.beginPath();
  ctx.roundRect(cx - hw, cy - hh, hw * 2, hh * 2, 3);
  ctx.fill();
  ctx.strokeStyle = "#444";
  ctx.lineWidth = 1;
  ctx.stroke();

  const litColors = ["#e74c3c", "#f39c12", "#2ecc71"];
  const dimColors = ["#4a1a1a", "#3a2d10", "#1a3a1a"];
  const activeIdx = signal === "red" ? 0 : signal === "yellow" ? 1 : 2;

  for (let i = 0; i < 3; i++) {
    const dotY = cy - gap + i * gap;
    ctx.beginPath();
    ctx.arc(cx, dotY, dotR, 0, Math.PI * 2);
    ctx.fillStyle = i === activeIdx ? litColors[i]! : dimColors[i]!;
    ctx.fill();
    if (i === activeIdx) {
      ctx.shadowColor = litColors[i]!;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(cx, dotY, dotR, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.shadowColor = "transparent";
    }
  }
}

function drawTrafficLights(ctx: CanvasRenderingContext2D, phase: number) {
  const hs = hSignal(phase);
  const vs = vSignal(phase);

  // ── Stop lines ──────────────────────────────────────────────────────────────
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  // Eastbound  (right-going, lanes 2-4 — below CENTER_Y)
  ctx.moveTo(VROAD_LEFT,  CENTER_Y + 4); ctx.lineTo(VROAD_LEFT,  ROAD_BOT  - 3);
  // Westbound  (left-going,  lanes 0-1 — above CENTER_Y)
  ctx.moveTo(VROAD_RIGHT, ROAD_TOP  + 3); ctx.lineTo(VROAD_RIGHT, CENTER_Y  - 4);
  // Southbound (left half of vertical road)
  ctx.moveTo(VROAD_LEFT  + 3, ROAD_TOP); ctx.lineTo(VROAD_CENTER_X - 3, ROAD_TOP);
  // Northbound (right half of vertical road)
  ctx.moveTo(VROAD_CENTER_X + 3, ROAD_BOT); ctx.lineTo(VROAD_RIGHT - 3, ROAD_BOT);
  ctx.stroke();

  // ── Lamp fixtures ────────────────────────────────────────────────────────────
  // Eastbound lamp: left of intersection, in right-lane area
  drawOneLamp(ctx, VROAD_LEFT - 14, Math.round((CENTER_Y + ROAD_BOT) / 2), hs);
  // Westbound lamp: right of intersection, in left-lane area
  drawOneLamp(ctx, VROAD_RIGHT + 14, Math.round((ROAD_TOP + CENTER_Y) / 2), hs);
  // Southbound lamp: above intersection, in southbound lane (left half of V road)
  drawOneLamp(ctx, VLANE_SOUTH_X, ROAD_TOP - 18, vs);
  // Northbound lamp: below intersection, in northbound lane (right half of V road)
  drawOneLamp(ctx, VLANE_NORTH_X, ROAD_BOT + 18, vs);
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
];

export function VehicleSimulation() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const vehiclesRef = useRef<Vehicle[]>([]);
  const vVehiclesRef = useRef<VVehicle[]>([]);
  const rafRef = useRef<number>(0);
  const pausedRef = useRef(false);
  const dashOffsetRef = useRef(0);
  const trafficLightRef = useRef({ phase: 0, timer: PHASE_DURATIONS[0] });

  const [paused, setPaused] = useState(false);
  const [counts, setCounts] = useState<Record<VehicleType, number>>({
    truck: 0, car: 0, motorcycle: 0,
  });

  const syncCounts = useCallback(() => {
    const c: Record<VehicleType, number> = { truck: 0, car: 0, motorcycle: 0 };
    vehiclesRef.current.forEach(v => c[v.type]++);
    setCounts({ ...c });
  }, []);

  const addVehicle = useCallback((type: VehicleType) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cw = canvas.width;
    // Pick the lane for this vehicle type that has the fewest vehicles
    const preferredLanes = type === "motorcycle"
      ? [0, 3, 4, 1, 2]
      : type === "truck"
        ? [1, 2, 0, 3, 4]
        : [0, 1, 2, 3, 4];
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
      ["car", 0], ["car", 1], ["car", 2], ["car", 3],
      ["truck", 1],
      ["motorcycle", 4],
    ];
    // Spread vehicles across lanes at random positions
    initialSpawns.forEach(([type, lane]) => {
      const v = spawnVehicle(type, lane, cw);
      v.x = Math.random() * cw;
      vehiclesRef.current.push(v);
    });

    // Seed vertical vehicles spread across the canvas height
    const vInitialSpawns: [VehicleType, 0 | 1][] = [
      ["car", 0], ["car", 1],
      ["truck", 0],
      ["motorcycle", 1],
    ];
    vInitialSpawns.forEach(([type, vLane]) => {
      const v = spawnVVehicle(type, vLane);
      v.y = Math.random() * CANVAS_H;
      vVehiclesRef.current.push(v);
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
        // Advance traffic light phase
        const tl = trafficLightRef.current;
        tl.timer--;
        if (tl.timer <= 0) {
          tl.phase = (tl.phase + 1) % 4;
          tl.timer = PHASE_DURATIONS[tl.phase as 0 | 1 | 2 | 3];
        }

        tickVehicles(vehiclesRef.current, vVehiclesRef.current, cw, trafficLightRef.current.phase);
        tickVVehicles(vVehiclesRef.current, vehiclesRef.current, trafficLightRef.current.phase);
        dashOffsetRef.current = (dashOffsetRef.current + 1.2) % 48;
      }

      // Draw
      ctx.clearRect(0, 0, cw, CANVAS_H);
      drawRoad(ctx, cw, dashOffsetRef.current);
      drawTrafficLights(ctx, trafficLightRef.current.phase);

      // Build unified draw list sorted by y for correct overlap at intersection
      const drawList: Array<{ sortY: number; draw: () => void }> = [];

      vehiclesRef.current.forEach(v => {
        const def = DEFS[v.type];
        const dir = LANES[v.lane]!.dir;
        const vy = getVehicleY(v);
        drawList.push({ sortY: vy, draw: () => {
          ctx.save();
          ctx.translate(v.x, vy);
          if (dir === -1) ctx.scale(-1, 1);
          ctx.shadowColor = "rgba(0,0,0,0.5)";
          ctx.shadowBlur = 6;
          ctx.shadowOffsetX = dir === 1 ? -2 : 2;
          ctx.shadowOffsetY = 3;
          switch (v.type) {
            case "truck":      drawTruck(ctx, v.color); break;
            case "car":        drawCar(ctx, v.color); break;
            case "motorcycle": drawMotorcycle(ctx, v.color, v.wheelAngle); break;
          }
          ctx.shadowColor = "transparent"; ctx.shadowBlur = 0;
          ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
          ctx.scale(dir, 1);
          ctx.fillStyle = "rgba(255,255,255,0.7)";
          ctx.font = "8px monospace"; ctx.textAlign = "center";
          ctx.fillText(`${(v.speed * 60).toFixed(0)}`, 0, -def.h / 2 - 5);
          ctx.restore();
        }});
      });

      vVehiclesRef.current.forEach(v => {
        const def = DEFS[v.type];
        const dir = vDir(v.vLane);
        const lx = vLaneX(v.vLane) + v.wobble;
        drawList.push({ sortY: v.y, draw: () => {
          ctx.save();
          ctx.translate(lx, v.y);
          // Rotate so the existing right-facing draw functions point in the travel direction
          ctx.rotate(dir === 1 ? Math.PI / 2 : -Math.PI / 2);
          ctx.shadowColor = "rgba(0,0,0,0.5)";
          ctx.shadowBlur = 6;
          ctx.shadowOffsetX = -2; ctx.shadowOffsetY = 3;
          switch (v.type) {
            case "truck":      drawTruck(ctx, v.color); break;
            case "car":        drawCar(ctx, v.color); break;
            case "motorcycle": drawMotorcycle(ctx, v.color, v.wheelAngle); break;
          }
          ctx.shadowColor = "transparent"; ctx.shadowBlur = 0;
          ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
          // Speed label — unrotate so text is readable
          ctx.rotate(dir === 1 ? -Math.PI / 2 : Math.PI / 2);
          ctx.fillStyle = "rgba(255,255,255,0.7)";
          ctx.font = "8px monospace"; ctx.textAlign = "center";
          ctx.fillText(`${(v.speed * 60).toFixed(0)}`, 0, -def.h / 2 - 5);
          ctx.restore();
        }});
      });

      drawList.sort((a, b) => a.sortY - b.sortY);
      drawList.forEach(item => item.draw());

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
        Crossroads Traffic Simulation
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
          {[{ label: "← Fast", y: LANES[0]!.y }, { label: "← Slow", y: LANES[1]!.y }, { label: "Slow →", y: LANES[2]!.y }, { label: "Fast →", y: LANES[3]!.y }, { label: "Express →", y: LANES[4]!.y }]
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
