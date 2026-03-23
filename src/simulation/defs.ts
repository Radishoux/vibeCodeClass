import type { VehicleType, VehicleDef } from "./types";

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
