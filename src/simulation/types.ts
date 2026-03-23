export type VehicleType = "truck" | "car" | "motorcycle";
export type Direction = 1 | -1;

export interface VehicleDef {
  w: number; h: number;
  minSpeed: number; maxSpeed: number;
  accel: number; decel: number;
  gap: number;
  colors: string[];
  label: string;
}

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
