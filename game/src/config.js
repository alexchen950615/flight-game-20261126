// Skyline Courier — shared tuning numbers and the three missions.
// One file, one job: every magic number the rest of the game needs lives here
// so a balance tweak never means hunting through the renderer.

export const CANVAS_WIDTH = 1280;
export const CANVAS_HEIGHT = 720;
export const HORIZON_Y = 296;
export const FOCAL_LENGTH = 560;

// Flight model limits. Speeds are knots, altitudes feet, distances metres.
export const FLIGHT = {
  minSpeed: 55,
  maxSpeed: 245,
  cruiseSpeed: 150,
  accelRate: 42,
  dragRate: 18,
  maxPitchDeg: 24,
  maxBankDeg: 62,
  turnRate: 0.42,
  climbFactor: 0.9,
  stallSpeed: 72,
  sinkRate: 26,
  groundClearance: 4,
};

// Fuel and damage economy: full throttle burns the tank in about two minutes,
// so a sortie is a decision about when to push and when to cruise.
export const ECONOMY = {
  fuelStart: 100,
  burnIdle: 0.16,
  burnFull: 0.62,
  ringScore: 100,
  centreBonus: 50,
  landingScore: 500,
  timeBonusPerSecond: 4,
  clipDamage: 16,
  hardLandingDamage: 45,
  maxDamage: 100,
};

export const RING_RADIUS = 26;

// The world is a valley that runs north. The runway sits at its far end;
// the three missions are three different ways to fly the same valley.
export const WORLD = {
  seed: 20261126,
  valleyHalfWidth: 420,
  runway: { x: 0, zStart: 5200, zEnd: 5800, halfWidth: 16 },
  terrainScale: 0.011,
  hillHeight: 34,
};

// One palette per mission: morning, golden dusk, storm. The renderer and the
// HUD both read from here so sky, ground and instruments stay one style.
export const PALETTES = {
  morning: {
    skyTop: '#274b8f', skyMid: '#6ea8dd', skyLow: '#cfe4f2',
    sun: '#fff3c4', sunGlow: 'rgba(255, 236, 170, 0.55)',
    groundFar: '#7d9b5e', groundNear: '#4f7038',
    fieldColors: ['#8aa860', '#a8b878', '#6f9a52', '#b5a05e', '#7fae6d'],
    mountainFar: '#8fa8c8', mountainNear: '#5f7ba0',
    ring: '#19d3ff', ringNext: '#ffd23e', ringDone: '#37e08a',
  },
  dusk: {
    skyTop: '#3a2a63', skyMid: '#c96f4a', skyLow: '#f7c489',
    sun: '#ffdf9e', sunGlow: 'rgba(255, 170, 90, 0.6)',
    groundFar: '#8a7a52', groundNear: '#54452c',
    fieldColors: ['#9a8a58', '#b09a62', '#7d7046', '#a87f4e', '#8f7f52'],
    mountainFar: '#7d6a94', mountainNear: '#54436e',
    ring: '#ffb347', ringNext: '#ffe066', ringDone: '#4ade80',
  },
  storm: {
    skyTop: '#1c2436', skyMid: '#4a5a78', skyLow: '#8d9bb5',
    sun: '#dfe8f5', sunGlow: 'rgba(200, 210, 235, 0.35)',
    groundFar: '#5c6b52', groundNear: '#39432f',
    fieldColors: ['#66755c', '#7a8568', '#55634e', '#6d7256', '#5f7059'],
    mountainFar: '#5d6a80', mountainNear: '#3d4a60',
    ring: '#7ef0ff', ringNext: '#ffe066', ringDone: '#4ade80',
  },
};

// Missions: same valley, three different jobs. Rings are waypoints in world
// space (lateral metres, altitude feet, distance metres along the valley).
export const MISSIONS = [
  {
    id: 'ring-run',
    name: 'Ring Run',
    subtitle: 'Alder Valley — thread all eight rings',
    palette: 'morning',
    briefing: 'Eight rings down the valley. Smooth throttle, gentle banks, and every ring is worth 100.',
    timeLimit: 150,
    fuel: 100,
    needsLanding: false,
    rings: [
      { x: 0, alt: 320, z: 600 }, { x: -70, alt: 380, z: 1200 },
      { x: 90, alt: 300, z: 1800 }, { x: 40, alt: 460, z: 2400 },
      { x: -110, alt: 360, z: 3000 }, { x: 120, alt: 300, z: 3600 },
      { x: -40, alt: 420, z: 4200 }, { x: 0, alt: 340, z: 4800 },
    ],
  },
  {
    id: 'mail-run',
    name: 'Mail Run',
    subtitle: 'Dusk Delivery — rings, then put her down on runway 27',
    palette: 'dusk',
    briefing: 'Six rings, then land on the strip at the end of the valley. Slow, level and lined up — a hard touchdown bends the airframe.',
    timeLimit: 180,
    fuel: 100,
    needsLanding: true,
    rings: [
      { x: 60, alt: 360, z: 700 }, { x: -80, alt: 300, z: 1400 },
      { x: 100, alt: 420, z: 2100 }, { x: -60, alt: 340, z: 2800 },
      { x: 80, alt: 380, z: 3500 }, { x: 0, alt: 300, z: 4300 },
    ],
  },
  {
    id: 'storm-courier',
    name: 'Storm Courier',
    subtitle: 'Night freight — ten rings, a tight tank, no second chances',
    palette: 'storm',
    briefing: 'Ten rings in bad weather on a tight tank. Full throttle eats fuel; cruise and pick your line.',
    timeLimit: 170,
    fuel: 78,
    needsLanding: false,
    rings: [
      { x: 0, alt: 340, z: 500 }, { x: -120, alt: 400, z: 1000 },
      { x: 130, alt: 300, z: 1500 }, { x: -60, alt: 460, z: 2000 },
      { x: 90, alt: 320, z: 2500 }, { x: -140, alt: 380, z: 3000 },
      { x: 60, alt: 300, z: 3500 }, { x: -90, alt: 440, z: 4000 },
      { x: 110, alt: 340, z: 4500 }, { x: 0, alt: 320, z: 5000 },
    ],
  },
];

export const MISSION_COUNT = MISSIONS.length;
