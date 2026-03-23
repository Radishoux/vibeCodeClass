// All draw functions assume ctx is already translated to vehicle center
// and scaled -1 for left-going vehicles (so they always face right in local space).

import { darken, lighten } from "./colors";

export function drawTruck(ctx: CanvasRenderingContext2D, color: string) {
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

export function drawCar(ctx: CanvasRenderingContext2D, color: string) {
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

export function drawMotorcycle(ctx: CanvasRenderingContext2D, color: string, wheelAngle: number) {
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
