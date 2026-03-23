import {
  CANVAS_H, ROAD_TOP, ROAD_BOT, CENTER_Y, LANES,
  VROAD_LEFT, VROAD_RIGHT, VROAD_CENTER_X,
} from "../simulation";

export function drawRoad(ctx: CanvasRenderingContext2D, cw: number, dashOffset: number) {
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
