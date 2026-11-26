// Skyline Courier — deterministic screenshot setups.
// One file, one job: the ?shot= query parameter puts the game into a fixed,
// photogenic state so screenshots are real renders of the game in a known
// moment. Nothing here changes how the game plays; it only presets it.

import { MISSIONS } from './config.js';
import { createPlane } from './aircraft.js';
import { buildCourse } from './rings.js';

// cover: morning Ring Run, mid-valley with the next ring close and the
// runway far ahead. rings: storm mission, a ring filling the frame.
// landing: dusk Mail Run on final approach, strip dead ahead.
// menu: the title screen over the valley.
const SHOTS = {
  cover: { mission: 0, z: 1560, x: 70, altitude: 372, heading: 2, speed: 178, throttle: 0.72, fuel: 84, clearThrough: 2 },
  rings: { mission: 2, z: 2320, x: 85, altitude: 348, heading: 1, speed: 165, throttle: 0.66, fuel: 61, clearThrough: 4 },
  landing: { mission: 1, z: 5120, x: 2, altitude: 80, heading: 0, speed: 115, throttle: 0.32, fuel: 52, clearThrough: 6 },
  menu: { mission: 0 },
};

export function shotFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('shot');
}

// Apply a named shot to a fresh game object. Returns true when a shot was
// applied, false when the game should start normally on the title screen.
export function applyShot(game, name) {
  const shot = SHOTS[name];
  if (!shot) return false;
  game.missionIndex = shot.mission;
  game.mission = MISSIONS[shot.mission];
  if (name === 'menu') {
    game.state = 'menu';
    game.plane = createPlane();
    game.course = buildCourse(game.mission);
    game.timeLeft = game.mission.timeLimit;
    return true;
  }
  game.state = 'flying';
  game.plane = createPlane();
  const plane = game.plane;
  plane.z = shot.z;
  plane.x = shot.x;
  plane.altitude = shot.altitude;
  plane.heading = shot.heading;
  plane.speed = shot.speed;
  plane.throttle = shot.throttle;
  plane.fuel = shot.fuel;
  game.course = buildCourse(game.mission);
  for (let i = 0; i < shot.clearThrough; i++) {
    const ring = game.course[i];
    if (ring) {
      ring.state = 'cleared';
      plane.ringsCleared += 1;
      plane.score += 100;
    }
  }
  game.timeLeft = game.mission.timeLimit - 42;
  game.shotMode = true;
  return true;
}
