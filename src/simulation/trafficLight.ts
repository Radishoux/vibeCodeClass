// phase: 0 = H_GREEN, 1 = H_YELLOW, 2 = V_GREEN, 3 = V_YELLOW
export const PHASE_DURATIONS = [360, 80, 360, 80] as const;

export function hSignal(phase: number): "green" | "yellow" | "red" {
  return phase === 0 ? "green" : phase === 1 ? "yellow" : "red";
}

export function vSignal(phase: number): "green" | "yellow" | "red" {
  return phase === 2 ? "green" : phase === 3 ? "yellow" : "red";
}
