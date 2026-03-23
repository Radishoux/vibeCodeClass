import { useEffect, useRef, useState, useCallback } from "react";
import {
  type VehicleType, type Vehicle, type VVehicle,
  CANVAS_H, LANES, DEFS, PHASE_DURATIONS,
  spawnVehicle, spawnVVehicle, vDir, vLaneX,
  tickVehicles, tickVVehicles,
} from "./simulation";
import { drawRoad } from "./draw/road";
import { drawTrafficLights } from "./draw/trafficLights";
import { drawTruck, drawCar, drawMotorcycle } from "./draw/vehicles";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getVehicleY(v: Vehicle): number {
  if (!v.laneChanging) return LANES[v.lane]!.y + v.wobble;
  const t = v.laneChangeProg;
  const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  return v.fromY + (v.toY - v.fromY) * ease + v.wobble;
}

const TYPE_LABELS: { type: VehicleType; emoji: string; color: string }[] = [
  { type: "truck",      emoji: "🚚", color: "#e67e22" },
  { type: "car",        emoji: "🚗", color: "#3498db" },
  { type: "motorcycle", emoji: "🏍️", color: "#c0392b" },
];

// ─── Component ────────────────────────────────────────────────────────────────
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
    initialSpawns.forEach(([type, lane]) => {
      const v = spawnVehicle(type, lane, cw);
      v.x = Math.random() * cw;
      vehiclesRef.current.push(v);
    });

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
