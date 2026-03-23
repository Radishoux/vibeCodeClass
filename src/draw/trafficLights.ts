import {
  ROAD_TOP, ROAD_BOT, CENTER_Y,
  VROAD_LEFT, VROAD_RIGHT, VROAD_CENTER_X,
  VLANE_SOUTH_X, VLANE_NORTH_X,
  hSignal, vSignal,
} from "../simulation";

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

export function drawTrafficLights(ctx: CanvasRenderingContext2D, phase: number) {
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
