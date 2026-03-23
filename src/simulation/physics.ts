import type { Vehicle, VVehicle } from "./types";
import { DEFS } from "./defs";
import { LANES, ROAD_TOP, ROAD_BOT, CANVAS_H, VROAD_LEFT, VROAD_RIGHT } from "./constants";
import { hSignal, vSignal } from "./trafficLight";
import { randomSpeed, vDir } from "./spawn";

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
