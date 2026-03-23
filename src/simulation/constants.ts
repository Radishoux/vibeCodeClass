import type { Direction } from "./types";

export const CANVAS_H = 440;
export const CANVAS_W = 900;
export const ROAD_TOP = 48;
export const ROAD_BOT = 392;
export const CENTER_Y = (ROAD_TOP + ROAD_BOT) / 2;

export const LANES: { y: number; dir: Direction }[] = [
  { y: 93,  dir: -1 }, // 0 — left fast
  { y: 157, dir: -1 }, // 1 — left slow
  { y: 225, dir:  1 }, // 2 — right slow
  { y: 290, dir:  1 }, // 3 — right fast
  { y: 355, dir:  1 }, // 4 — right express
];

export const VROAD_CENTER_X = 450;
export const VROAD_LANE_W   = 56;
export const VROAD_LEFT     = VROAD_CENTER_X - VROAD_LANE_W; // 394
export const VROAD_RIGHT    = VROAD_CENTER_X + VROAD_LANE_W; // 506
export const VLANE_SOUTH_X  = VROAD_CENTER_X - VROAD_LANE_W / 2; // 422
export const VLANE_NORTH_X  = VROAD_CENTER_X + VROAD_LANE_W / 2; // 478
