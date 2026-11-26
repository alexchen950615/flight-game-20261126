// Skyline Courier — the flight model.
// One file, one job: how the aeroplane moves. Throttle sets a target speed,
// pitch trades speed for altitude, bank turns the nose, and below stall speed
// the wing stops flying and the nose drops. Pure numbers in, pure numbers out.

import { FLIGHT, WORLD } from './config.js';
import { clamp, degToRad, wrapAngleDeg } from './random.js';
import { terrainHeightAt } from './terrain.js';

export function createPlane() {
  return {
    x: 0,           // lateral metres from the valley centreline
    z: 0,           // metres flown down the valley
    altitude: 340,  // feet above sea level (valley floor is ~0)
    heading: 0,     // degrees, 0 = straight down the valley
    speed: 150,     // knots
    throttle: 0.62,
    pitch: 0,       // degrees, positive = nose up
    bank: 0,        // degrees, positive = right wing down
    fuel: 100,
    damage: 0,
    score: 0,
    ringsCleared: 0,
    ringsMissed: 0,
    landed: false,
    crashed: false,
    crashReason: '',
    shake: 0,
  };
}

// One physics tick. control is { pitch: -1..1, bank: -1..1, throttle: -1..1 }
// from the keyboard/mouse layer; dt is seconds.
export function stepFlight(plane, control, dt) {
  if (plane.crashed || plane.landed) return;

  // Throttle eases toward its target; the engine answers, it does not snap.
  plane.throttle = clamp(plane.throttle + control.throttle * dt * 0.9, 0, 1);
  const targetSpeed = FLIGHT.minSpeed + plane.throttle * (FLIGHT.maxSpeed - FLIGHT.minSpeed);
  const accel = targetSpeed > plane.speed ? FLIGHT.accelRate : FLIGHT.dragRate;
  plane.speed += clamp(targetSpeed - plane.speed, -accel * dt, accel * dt);

  // Pitch and bank chase the stick with a little lag, so the controls feel
  // like hydraulics rather than a light switch.
  const targetPitch = control.pitch * FLIGHT.maxPitchDeg;
  const targetBank = control.bank * FLIGHT.maxBankDeg;
  plane.pitch += clamp(targetPitch - plane.pitch, -90 * dt, 90 * dt);
  plane.bank += clamp(targetBank - plane.bank, -120 * dt, 120 * dt);

  // Bank turns the aeroplane; the turn tightens with bank and speed.
  const turnDeg = Math.tan(degToRad(plane.bank)) * FLIGHT.turnRate * plane.speed * dt * 0.55;
  plane.heading = wrapAngleDeg(plane.heading + turnDeg);

  // Forward motion, then altitude from pitch — and a stall sink when slow.
  const headingRad = degToRad(plane.heading);
  const forward = plane.speed * 0.514444 * dt; // knots -> metres per second
  plane.x += Math.sin(headingRad) * forward;
  plane.z += Math.cos(headingRad) * forward;
  let verticalSpeed = Math.sin(degToRad(plane.pitch)) * plane.speed * FLIGHT.climbFactor;
  if (plane.speed < FLIGHT.stallSpeed) {
    verticalSpeed -= FLIGHT.sinkRate * (1 - plane.speed / FLIGHT.stallSpeed);
  }
  plane.altitude += verticalSpeed * dt * 3.28084 * 0.55;

  // Fuel burns faster the harder the engine works.
  const burn = (0.16 + plane.throttle * 0.62) * dt;
  plane.fuel = Math.max(0, plane.fuel - burn);
  if (plane.fuel <= 0 && plane.throttle > 0.15) plane.throttle = 0.15;

  // Valley walls: drifting too far sideways meets rising ground.
  plane.shake = Math.max(0, plane.shake - dt * 2.4);

  const ground = terrainHeightAt(plane.x, plane.z);
  const rw = WORLD.runway;
  const overRunway = plane.z >= rw.zStart - 40 && plane.z <= rw.zEnd + 40
    && Math.abs(plane.x - rw.x) <= rw.halfWidth + 8;
  if (overRunway && plane.altitude < 0) plane.altitude = 0;
  // Over the strip the landing check decides the outcome, not the terrain:
  // a low pass there is a touchdown attempt, not a crash.
  if (plane.altitude <= ground + FLIGHT.groundClearance && !overRunway) {
    plane.crashed = true;
    plane.crashReason = 'terrain';
  }
  if (plane.z > WORLD.runway.zEnd + 900 && plane.altitude < 60) {
    plane.crashed = true;
    plane.crashReason = 'terrain';
  }
}

// The runway touchdown test: slow, level, lined up, over the strip.
export function checkLanding(plane) {
  const rw = WORLD.runway;
  const overStrip = plane.z >= rw.zStart && plane.z <= rw.zEnd
    && Math.abs(plane.x - rw.x) <= rw.halfWidth + 4;
  const gentle = plane.speed < 128 && Math.abs(plane.bank) < 16
    && Math.abs(plane.pitch) < 9 && plane.altitude <= 8;
  if (overStrip && gentle) {
    plane.landed = true;
    return true;
  }
  if (overStrip && plane.altitude <= 8) {
    // On the strip but too fast or too crooked: a hard touchdown.
    plane.damage += 45;
    plane.shake = 1;
    if (plane.damage >= 100) {
      plane.crashed = true;
      plane.crashReason = 'hard landing';
    } else {
      plane.landed = true;
    }
    return plane.landed;
  }
  return false;
}
