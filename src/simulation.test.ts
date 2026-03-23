import { describe, it, expect, beforeEach } from "bun:test";
import {
  hSignal, vSignal, PHASE_DURATIONS,
  DEFS, LANES, VROAD_LEFT, VROAD_RIGHT, ROAD_TOP, ROAD_BOT, CANVAS_H,
  tickVehicles, tickVVehicles,
  type Vehicle, type VVehicle,
  resetIdCounter,
} from "./simulation";

// ─── Helpers ──────────────────────────────────────────────────────────────────

let nextId = 1;
function makeVehicle(overrides: Partial<Vehicle> = {}): Vehicle {
  return {
    id: nextId++,
    type: "car",
    x: 100,
    lane: 2, // right-going (dir = +1)
    speed: 2,
    targetSpeed: 2,
    color: "#fff",
    wheelAngle: 0,
    wobble: 0,
    wobblePhase: 0,
    speedTimer: 999,
    laneChanging: false,
    fromY: LANES[2]!.y,
    toY: LANES[2]!.y,
    laneChangeProg: 1,
    ...overrides,
  };
}

function makeVVehicle(overrides: Partial<VVehicle> = {}): VVehicle {
  return {
    id: nextId++,
    type: "car",
    y: 100,
    vLane: 0, // southbound (dir = +1)
    speed: 2,
    targetSpeed: 2,
    color: "#fff",
    wheelAngle: 0,
    wobble: 0,
    wobblePhase: 0,
    speedTimer: 999,
    ...overrides,
  };
}

beforeEach(() => {
  nextId = 1;
  resetIdCounter();
});

// ─── Traffic light signals ────────────────────────────────────────────────────

describe("hSignal", () => {
  it("returns green on phase 0", () => expect(hSignal(0)).toBe("green"));
  it("returns yellow on phase 1", () => expect(hSignal(1)).toBe("yellow"));
  it("returns red on phase 2", () => expect(hSignal(2)).toBe("red"));
  it("returns red on phase 3", () => expect(hSignal(3)).toBe("red"));
});

describe("vSignal", () => {
  it("returns red on phase 0", () => expect(vSignal(0)).toBe("red"));
  it("returns red on phase 1", () => expect(vSignal(1)).toBe("red"));
  it("returns green on phase 2", () => expect(vSignal(2)).toBe("green"));
  it("returns yellow on phase 3", () => expect(vSignal(3)).toBe("yellow"));
});

describe("PHASE_DURATIONS", () => {
  it("has 4 phases", () => expect(PHASE_DURATIONS.length).toBe(4));
  it("green phases are longer than yellow phases", () => {
    expect(PHASE_DURATIONS[0]).toBeGreaterThan(PHASE_DURATIONS[1]);
    expect(PHASE_DURATIONS[2]).toBeGreaterThan(PHASE_DURATIONS[3]);
  });
});

// ─── Gap-following ────────────────────────────────────────────────────────────

describe("tickVehicles — gap following", () => {
  it("vehicle behind a slower leader reduces speed", () => {
    const leader = makeVehicle({ id: 1, x: 200, speed: 1, targetSpeed: 1 });
    const follower = makeVehicle({ id: 2, x: 100, speed: 3, targetSpeed: 3 });
    // gap = 200 - 100 - 22 - 22 = 56 (car half-widths = 22), within gap * 1.5 = 97.5
    tickVehicles([leader, follower], [], 900, 0);
    expect(follower.speed).toBeLessThan(3);
  });

  it("free-running vehicle maintains target speed", () => {
    const v = makeVehicle({ id: 1, x: 100, speed: 2, targetSpeed: 3.4 });
    tickVehicles([v], [], 900, 0);
    expect(v.speed).toBeGreaterThan(2); // accelerating toward targetSpeed
  });

  it("hard stop when gap reaches 0", () => {
    const carW = DEFS.car.w; // 44
    // Place follower so gap = 0 exactly
    const leader   = makeVehicle({ id: 1, x: 200, speed: 0, targetSpeed: 0 });
    const follower = makeVehicle({ id: 2, x: 200 - carW - 1, speed: 2, targetSpeed: 2 });
    tickVehicles([leader, follower], [], 900, 0);
    expect(follower.speed).toBe(0);
  });

  it("positional correction prevents overlap", () => {
    const carW = DEFS.car.w;
    // Deliberately overlap the two vehicles
    const leader   = makeVehicle({ id: 1, x: 200, speed: 0, targetSpeed: 0 });
    const follower = makeVehicle({ id: 2, x: 180, speed: 3, targetSpeed: 3 }); // overlapping
    tickVehicles([leader, follower], [], 900, 0);
    const gap = leader.x - follower.x - carW;
    expect(gap).toBeGreaterThanOrEqual(0);
  });
});

// ─── Traffic light braking ────────────────────────────────────────────────────

describe("tickVehicles — traffic light braking", () => {
  it("eastbound car decelerates when signal is red and approaching stop line", () => {
    // Lane 2: dir = +1 (eastbound), stop line at VROAD_LEFT - car.w/2 - 4 ≈ 368
    // brakeDist = max(65*2, 3.4*50) = 170; place within it: VROAD_LEFT - 100 → distToStop ≈ 74
    const v = makeVehicle({ id: 1, lane: 2, x: VROAD_LEFT - 100, speed: 3, targetSpeed: 3 });
    tickVehicles([v], [], 900, 2); // phase 2 = H red
    expect(v.speed).toBeLessThan(3);
  });

  it("eastbound car does NOT brake when signal is green and intersection is clear", () => {
    const v = makeVehicle({ id: 1, lane: 2, x: VROAD_LEFT - 200, speed: 2, targetSpeed: 3.4 });
    tickVehicles([v], [], 900, 0); // phase 0 = H green
    expect(v.speed).toBeGreaterThanOrEqual(2); // not slowed by light
  });

  it("eastbound car stops fully at stop line (distToStop <= 3)", () => {
    const stopX = VROAD_LEFT - DEFS.car.w / 2 - 4;
    // Start 2 px before stop: distToStop=2 ≤ 3, so wantedSpeed=0 immediately.
    // Speed 0.1 → decelerates to 0 in 2 ticks without crossing the stop line.
    const v = makeVehicle({ id: 1, lane: 2, x: stopX - 2, speed: 0.1, targetSpeed: 3 });
    for (let i = 0; i < 5; i++) tickVehicles([v], [], 900, 2);
    expect(v.speed).toBe(0);
  });
});

describe("tickVVehicles — traffic light braking", () => {
  it("southbound car decelerates when V signal is red", () => {
    const v = makeVVehicle({ id: 1, vLane: 0, y: ROAD_TOP - 150, speed: 3, targetSpeed: 3 });
    tickVVehicles([v], [], 0); // phase 0 = V red
    expect(v.speed).toBeLessThan(3);
  });

  it("northbound car decelerates when V signal is red", () => {
    const v = makeVVehicle({ id: 1, vLane: 1, y: ROAD_BOT + 150, speed: 3, targetSpeed: 3 });
    tickVVehicles([v], [], 0); // phase 0 = V red
    expect(v.speed).toBeLessThan(3);
  });

  it("southbound car does NOT brake when signal is green and intersection clear", () => {
    const v = makeVVehicle({ id: 1, vLane: 0, y: ROAD_TOP - 150, speed: 2, targetSpeed: 5 });
    tickVVehicles([v], [], 2); // phase 2 = V green
    expect(v.speed).toBeGreaterThanOrEqual(2);
  });
});

// ─── Intersection clearing ────────────────────────────────────────────────────

describe("intersection clearing", () => {
  it("H vehicle holds on green when a V vehicle is in the box", () => {
    const hVehicle = makeVehicle({ id: 1, lane: 2, x: VROAD_LEFT - 100, speed: 2, targetSpeed: 2 });
    // V vehicle inside the intersection box
    const vVehicle = makeVVehicle({ id: 2, y: (ROAD_TOP + ROAD_BOT) / 2, speed: 1, targetSpeed: 1 });
    const speedBefore = hVehicle.speed;
    tickVehicles([hVehicle], [vVehicle], 900, 0); // phase 0 = H green, but box occupied
    expect(hVehicle.speed).toBeLessThanOrEqual(speedBefore);
  });

  it("H vehicle proceeds on green when the box is clear", () => {
    const hVehicle = makeVehicle({ id: 1, lane: 2, x: VROAD_LEFT - 100, speed: 2, targetSpeed: 3.4 });
    // V vehicle far outside the box
    const vVehicle = makeVVehicle({ id: 2, y: -200, speed: 1, targetSpeed: 1 });
    tickVehicles([hVehicle], [vVehicle], 900, 0); // phase 0 = H green, box clear
    expect(hVehicle.speed).toBeGreaterThanOrEqual(2);
  });

  it("V vehicle holds on green when an H vehicle is in the box", () => {
    const vVehicle = makeVVehicle({ id: 1, vLane: 0, y: ROAD_TOP - 100, speed: 2, targetSpeed: 2 });
    // H vehicle inside the intersection box
    const hVehicle = makeVehicle({ id: 2, lane: 2, x: (VROAD_LEFT + VROAD_RIGHT) / 2, speed: 1, targetSpeed: 1 });
    const speedBefore = vVehicle.speed;
    tickVVehicles([vVehicle], [hVehicle], 2); // phase 2 = V green, but box occupied
    expect(vVehicle.speed).toBeLessThanOrEqual(speedBefore);
  });

  it("V vehicle proceeds on green when the box is clear", () => {
    const vVehicle = makeVVehicle({ id: 1, vLane: 0, y: ROAD_TOP - 100, speed: 2, targetSpeed: 5 });
    // H vehicle far outside the box
    const hVehicle = makeVehicle({ id: 2, lane: 2, x: -200, speed: 0, targetSpeed: 0 });
    tickVVehicles([vVehicle], [hVehicle], 2); // phase 2 = V green, box clear
    expect(vVehicle.speed).toBeGreaterThanOrEqual(2);
  });
});

// ─── Vehicle wrapping ─────────────────────────────────────────────────────────

describe("vehicle wrapping", () => {
  it("eastbound vehicle wraps from right edge to left", () => {
    const cw = 900;
    const v = makeVehicle({ id: 1, lane: 2, x: cw + 100, speed: 2, targetSpeed: 2 });
    tickVehicles([v], [], cw, 0);
    expect(v.x).toBeLessThan(0);
  });

  it("westbound vehicle wraps from left edge to right", () => {
    const cw = 900;
    const v = makeVehicle({ id: 1, lane: 0, x: -100, speed: 2, targetSpeed: 2 }); // lane 0 dir=-1
    tickVehicles([v], [], cw, 0);
    expect(v.x).toBeGreaterThan(cw);
  });

  it("southbound V vehicle wraps from bottom to top", () => {
    const v = makeVVehicle({ id: 1, vLane: 0, y: CANVAS_H + 100, speed: 2, targetSpeed: 2 });
    tickVVehicles([v], [], 2);
    expect(v.y).toBeLessThan(0);
  });
});
