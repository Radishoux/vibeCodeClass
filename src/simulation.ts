// Pure simulation logic — no React, no Canvas.
// Exported so it can be unit-tested independently.

export type VehicleType = "truck" | "car" | "motorcycle";
export type Direction = 1 | -1;

// ─── Lane layout ──────────────────────────────────────────────────────────────
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

// ─── Vertical road layout ─────────────────────────────────────────────────────
export const VROAD_CENTER_X = 450;
export const VROAD_LANE_W   = 56;
export const VROAD_LEFT     = VROAD_CENTER_X - VROAD_LANE_W; // 394
export const VROAD_RIGHT    = VROAD_CENTER_X + VROAD_LANE_W; // 506
export const VLANE_SOUTH_X  = VROAD_CENTER_X - VROAD_LANE_W / 2; // 422
export const VLANE_NORTH_X  = VROAD_CENTER_X + VROAD_LANE_W / 2; // 478

// ─── Vehicle specs ────────────────────────────────────────────────────────────
export interface VehicleDef {
  w: number; h: number;
  minSpeed: number; maxSpeed: number;
  accel: number; decel: number;
  gap: number;
  colors: string[];
  label: string;
}

export const DEFS: Record<VehicleType, VehicleDef> = {
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
};

// ─── Vehicle state ─────────────────────────────────────────────────────────────
export interface Vehicle {
  id: number;
  type: VehicleType;
  x: number;
  lane: number;
  speed: number;
  targetSpeed: number;
  color: string;
  wheelAngle: number;
  wobble: number;
  wobblePhase: number;
  speedTimer: number;
  laneChanging: boolean;
  fromY: number;
  toY: number;
  laneChangeProg: number;
}

export interface VVehicle {
  id: number;
  type: VehicleType;
  y: number;
  vLane: 0 | 1;
  speed: number;
  targetSpeed: number;
  color: string;
  wheelAngle: number;
  wobble: number;
  wobblePhase: number;
  speedTimer: number;
}

let _nextId = 1;
export function resetIdCounter() { _nextId = 1; }

export function randomSpeed(def: VehicleDef) {
  return def.minSpeed + Math.random() * (def.maxSpeed - def.minSpeed);
}

export function spawnVehicle(type: VehicleType, laneIdx: number, cw: number): Vehicle {
  const def = DEFS[type];
  const lane = LANES[laneIdx]!;
  const x = lane.dir === 1 ? -def.w / 2 - 20 : cw + def.w / 2 + 20;
  const speed = randomSpeed(def);
  return {
    id: _nextId++,
    type, lane: laneIdx, x, speed,
    targetSpeed: speed,
    color: def.colors[Math.floor(Math.random() * def.colors.length)]!,
    wheelAngle: 0, wobble: 0, wobblePhase: 0,
    speedTimer: 180,
    laneChanging: false,
    fromY: lane.y, toY: lane.y, laneChangeProg: 1,
  };
}

// vLane 0 = southbound (+y), vLane 1 = northbound (-y)
export function vDir(vLane: 0 | 1): 1 | -1 { return vLane === 0 ? 1 : -1; }
export function vLaneX(vLane: 0 | 1): number { return vLane === 0 ? VLANE_SOUTH_X : VLANE_NORTH_X; }

export function spawnVVehicle(type: VehicleType, vLane: 0 | 1): VVehicle {
  const def = DEFS[type];
  const dir = vDir(vLane);
  const speed = randomSpeed(def);
  return {
    id: _nextId++,
    type, vLane,
    y: dir === 1 ? -def.w / 2 - 20 : CANVAS_H + def.w / 2 + 20,
    speed, targetSpeed: speed,
    color: def.colors[0]!,
    wheelAngle: 0, wobble: 0, wobblePhase: 0,
    speedTimer: 180,
  };
}

// ─── Traffic light ─────────────────────────────────────────────────────────────
// phase: 0 = H_GREEN, 1 = H_YELLOW, 2 = V_GREEN, 3 = V_YELLOW
export const PHASE_DURATIONS = [360, 80, 360, 80] as const;

export function hSignal(phase: number): "green" | "yellow" | "red" {
  return phase === 0 ? "green" : phase === 1 ? "yellow" : "red";
}
export function vSignal(phase: number): "green" | "yellow" | "red" {
  return phase === 2 ? "green" : phase === 3 ? "yellow" : "red";
}

// ─── Physics ──────────────────────────────────────────────────────────────────
export function tickVehicles(vehicles: Vehicle[], vVehicles: VVehicle[], cw: number, phase: number) {
  const vInBox = vVehicles.some(vv => {
    const hw = DEFS[vv.type].w / 2;
    return vv.y + hw > ROAD_TOP && vv.y - hw < ROAD_BOT;
  });

  vehicles.forEach(v => {
    const def = DEFS[v.type];
    const dir = LANES[v.lane]!.dir;

    let minGap = Infinity;
    let aheadSpeed = Infinity;
    let aheadX = 0;
    let aheadHalfW = 0;
    vehicles.forEach(other => {
      if (other.id === v.id || other.lane !== v.lane) return;
      const dx = (other.x - v.x) * dir;
      if (dx <= 0) return;
      const gap = dx - def.w / 2 - DEFS[other.type].w / 2;
      if (gap < minGap) { minGap = gap; aheadSpeed = other.speed; aheadX = other.x; aheadHalfW = DEFS[other.type].w / 2; }
    });

    let wantedSpeed = v.targetSpeed;
    if (minGap < def.gap * 1.5) {
      const fraction = Math.max(0, (minGap - def.gap * 0.4) / (def.gap * 1.1));
      wantedSpeed = Math.min(wantedSpeed, aheadSpeed + (def.maxSpeed - aheadSpeed) * fraction);
    }
    if (minGap < def.gap * 0.5) wantedSpeed = Math.min(wantedSpeed, aheadSpeed * 0.5);
    if (minGap <= 1) { wantedSpeed = 0; v.speed = 0; }

    if (hSignal(phase) !== "green" || vInBox) {
      const stopX = dir === 1
        ? VROAD_LEFT  - def.w / 2 - 4
        : VROAD_RIGHT + def.w / 2 + 4;
      const distToStop = (stopX - v.x) * dir;
      if (distToStop > 0) {
        const brakeDist = Math.max(def.gap * 2, def.maxSpeed * 50);
        const t = Math.min(1, distToStop / brakeDist);
        wantedSpeed = Math.min(wantedSpeed, def.maxSpeed * t);
        if (distToStop <= 3) wantedSpeed = 0;
      }
    }

    if (v.speed < wantedSpeed) v.speed = Math.min(v.speed + def.accel, wantedSpeed);
    else if (v.speed > wantedSpeed) v.speed = Math.max(v.speed - def.decel, wantedSpeed);

    v.x += v.speed * dir;

    if (minGap < 0 && aheadHalfW > 0) {
      v.x = aheadX - dir * (def.w / 2 + aheadHalfW + 1);
      v.speed = 0;
    }

    const halfW = def.w / 2 + 20;
    if (dir === 1  && v.x >  cw + halfW) v.x = -halfW;
    if (dir === -1 && v.x < -halfW)      v.x = cw + halfW;

    v.wheelAngle += (v.speed / 31) * dir * Math.PI * 2;
    v.speedTimer--;
    if (v.speedTimer <= 0) {
      v.targetSpeed = randomSpeed(def);
      v.speedTimer = 160 + Math.floor(Math.random() * 260);
    }
    if (v.laneChanging) {
      v.laneChangeProg = Math.min(1, v.laneChangeProg + 0.025);
      if (v.laneChangeProg >= 1) v.laneChanging = false;
    }
  });
}

export function tickVVehicles(vVehicles: VVehicle[], vehicles: Vehicle[], phase: number) {
  const hInBox = vehicles.some(hv => {
    const hw = DEFS[hv.type].w / 2;
    return hv.x + hw > VROAD_LEFT && hv.x - hw < VROAD_RIGHT;
  });

  vVehicles.forEach(v => {
    const def = DEFS[v.type];
    const dir = vDir(v.vLane);

    let minGap = Infinity;
    let aheadSpeed = Infinity;
    let aheadY = 0;
    let aheadHalfW = 0;
    vVehicles.forEach(other => {
      if (other.id === v.id || other.vLane !== v.vLane) return;
      const dy = (other.y - v.y) * dir;
      if (dy <= 0) return;
      const gap = dy - def.w / 2 - DEFS[other.type].w / 2;
      if (gap < minGap) { minGap = gap; aheadSpeed = other.speed; aheadY = other.y; aheadHalfW = DEFS[other.type].w / 2; }
    });

    let wantedSpeed = v.targetSpeed;
    if (minGap < def.gap * 1.5) {
      const fraction = Math.max(0, (minGap - def.gap * 0.4) / (def.gap * 1.1));
      wantedSpeed = Math.min(wantedSpeed, aheadSpeed + (def.maxSpeed - aheadSpeed) * fraction);
    }
    if (minGap < def.gap * 0.5) wantedSpeed = Math.min(wantedSpeed, aheadSpeed * 0.5);
    if (minGap <= 1) { wantedSpeed = 0; v.speed = 0; }

    if (vSignal(phase) !== "green" || hInBox) {
      const stopY = dir === 1
        ? ROAD_TOP - def.w / 2 - 4
        : ROAD_BOT + def.w / 2 + 4;
      const distToStop = (stopY - v.y) * dir;
      if (distToStop > 0) {
        const brakeDist = Math.max(def.gap * 2, def.maxSpeed * 50);
        const t = Math.min(1, distToStop / brakeDist);
        wantedSpeed = Math.min(wantedSpeed, def.maxSpeed * t);
        if (distToStop <= 3) wantedSpeed = 0;
      }
    }

    if (v.speed < wantedSpeed) v.speed = Math.min(v.speed + def.accel, wantedSpeed);
    else if (v.speed > wantedSpeed) v.speed = Math.max(v.speed - def.decel, wantedSpeed);

    v.y += v.speed * dir;

    if (minGap < 0 && aheadHalfW > 0) {
      v.y = aheadY - dir * (def.w / 2 + aheadHalfW + 1);
      v.speed = 0;
    }

    const halfW = def.w / 2 + 20;
    if (dir === 1  && v.y > CANVAS_H + halfW) v.y = -halfW;
    if (dir === -1 && v.y < -halfW)           v.y = CANVAS_H + halfW;

    v.wheelAngle += (v.speed / 31) * dir * Math.PI * 2;
    v.speedTimer--;
    if (v.speedTimer <= 0) {
      v.targetSpeed = randomSpeed(def);
      v.speedTimer = 160 + Math.floor(Math.random() * 260);
    }
  });
}
