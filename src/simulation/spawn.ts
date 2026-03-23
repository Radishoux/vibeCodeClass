import type { VehicleType, VehicleDef, Vehicle, VVehicle } from "./types";
import { DEFS } from "./defs";
import { LANES, CANVAS_H, VLANE_SOUTH_X, VLANE_NORTH_X } from "./constants";

let _nextId = 1;
export function resetIdCounter() { _nextId = 1; }

export function randomSpeed(def: VehicleDef): number {
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
