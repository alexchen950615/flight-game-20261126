// Skyline Courier — the game itself: loop, states, missions and overlays.
// One file, one job: own the state machine (menu / flying / paused / crashed
// / landed / complete), drive one frame at a time, and compose the world,
// the rings, the aeroplane and the instruments into a picture. Flight,
// terrain, rings, HUD and input each live in their own file.

import { clamp } from './random.js';
import { CANVAS_WIDTH, CANVAS_HEIGHT, MISSIONS, PALETTES, ECONOMY } from './config.js';
import { createPlane, stepFlight, checkLanding } from './aircraft.js';
import { drawWorld, terrainHeightAt } from './terrain.js';
import { buildCourse, nextRing, judgeRings, drawRings, drawNextRingGuide } from './rings.js';
import { drawAeroplane, drawHud, drawInstruments } from './hud.js';
import { createInput, attachInput, readControls, consumePressed, endFrame } from './input.js';
import {
  createAudio, ensureAudio, updateEngineSound,
  playRingChime, playClipThud, playWarning, playLandingFanfare, playCrash,
} from './audio.js';
import { shotFromUrl, applyShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const PANEL_Y = 596; // must match hud.js: where the instrument panel starts

const game = {
  state: 'menu', // menu | flying | paused | crashed | landed | complete
  missionIndex: 0,
  mission: MISSIONS[0],
  plane: createPlane(),
  course: buildCourse(MISSIONS[0]),
  timeLeft: MISSIONS[0].timeLimit,
  elapsed: 0,
  message: null,
  messageTtl: 0,
  flash: null,
  shotMode: false,
  warnCooldown: 0,
  camera: { pitchScreen: 0 },
};

const input = createInput();
attachInput(input, canvas);
const audio = createAudio();

function flashMessage(text, color, seconds = 2.2) {
  game.message = { text, color, alpha: 1 };
  game.messageTtl = seconds;
}

function startMission(index) {
  game.missionIndex = index;
  game.mission = MISSIONS[index];
  game.plane = createPlane();
  game.plane.fuel = game.mission.fuel;
  game.course = buildCourse(game.mission);
  game.timeLeft = game.mission.timeLimit;
  game.elapsed = 0;
  game.state = 'flying';
  game.message = null;
  ensureAudio(audio);
  flashMessage(game.mission.name.toUpperCase() + ' — ' + game.mission.subtitle.toUpperCase(), '#ffd23e', 3);
}

function onFlightEvent(event) {
  if (event.type === 'ring') {
    playRingChime(audio);
    const bonus = event.bonus > 0 ? `  +${ECONOMY.ringScore + event.bonus}  CENTRE!` : `  +${ECONOMY.ringScore}`;
    flashMessage(`RING ${event.ring.index + 1} CLEAR${bonus}`, '#37e08a');
  } else if (event.type === 'clip') {
    playClipThud(audio);
    flashMessage(`RING CLIPPED  +40  — AIRFRAME ${Math.round(game.plane.damage)}%`, '#ff9f43');
  } else if (event.type === 'miss') {
    playWarning(audio);
    flashMessage(`RING ${event.ring.index + 1} MISSED`, '#ff5a4e');
  }
  if (game.plane.crashed) endCrash();
}

function endCrash() {
  game.state = 'crashed';
  playCrash(audio);
  const reason = game.plane.crashReason === 'hard landing'
    ? 'HARD LANDING — THE AIRFRAME GAVE OUT'
    : game.plane.crashReason === 'airframe'
      ? 'AIRFRAME FAILURE — TOO MANY CLIPS'
      : 'TERRAIN — YOU FLEW INTO THE VALLEY';
  game.crashText = reason;
}

function endLanding() {
  game.state = 'landed';
  game.plane.score += ECONOMY.landingScore;
  const timeBonus = Math.round(game.timeLeft) * ECONOMY.timeBonusPerSecond;
  game.plane.score += timeBonus;
  game.timeBonus = timeBonus;
  playLandingFanfare(audio);
}

function endComplete() {
  game.state = 'complete';
  const timeBonus = Math.round(game.timeLeft) * ECONOMY.timeBonusPerSecond;
  game.plane.score += timeBonus;
  game.timeBonus = timeBonus;
  playLandingFanfare(audio);
}

// The title screen flies itself: a gentle autopilot threads the rings so the
// menu is alive behind the title instead of a still picture.
function autopilot(dt) {
  const plane = game.plane;
  const ring = nextRing(game.course);
  const target = ring ?? { x: 0, alt: 340 };
  const dx = target.x - plane.x;
  const dAlt = target.alt - plane.altitude;
  const bank = Math.max(-0.7, Math.min(0.7, dx * 0.012));
  const pitch = Math.max(-0.6, Math.min(0.6, dAlt * 0.008));
  stepFlight(plane, { pitch, bank, throttle: 0.1 }, dt);
  if (plane.z > 5600 || plane.crashed) {
    game.plane = createPlane();
    game.course = buildCourse(game.mission);
  }
}

function update(dt) {
  game.elapsed += dt;
  if (game.messageTtl > 0) {
    game.messageTtl -= dt;
    if (game.message) game.message.alpha = Math.max(0, game.messageTtl / 0.8);
    if (game.messageTtl <= 0) game.message = null;
  }
  game.warnCooldown = Math.max(0, game.warnCooldown - dt);

  if (game.state === 'menu') {
    autopilot(dt);
    return;
  }
  if (game.state !== 'flying') return;

  const controls = readControls(input);
  stepFlight(game.plane, controls, dt);
  updateEngineSound(audio, game.plane.throttle, game.plane.speed);
  game.timeLeft -= dt;

  // Low over the valley floor with no runway under you: pull up.
  const ground = terrainHeightAt(game.plane.x, game.plane.z);
  if (game.plane.altitude - ground < 70 && !game.message) {
    flashMessage('PULL UP', '#ff5a4e', 0.9);
    if (game.warnCooldown <= 0) {
      playWarning(audio);
      game.warnCooldown = 1.4;
    }
  }

  judgeRings(game.course, game.plane, onFlightEvent);
  if (game.plane.crashed) {
    endCrash();
    return;
  }
  if (game.mission.needsLanding && game.plane.altitude <= 10) {
    if (checkLanding(game.plane)) {
      endLanding();
      return;
    }
    if (game.plane.crashed) {
      endCrash();
      return;
    }
  }
  if (game.timeLeft <= 0) {
    game.state = 'crashed';
    game.crashText = 'OUT OF TIME — THE SORTIE WINDOW CLOSED';
    playCrash(audio);
    return;
  }
  if (!game.mission.needsLanding && nextRing(game.course) === null && game.course.length > 0) {
    endComplete();
  }
}

function handleKeys() {
  if (consumePressed(input, 'p') || consumePressed(input, 'escape')) {
    if (game.state === 'flying') game.state = 'paused';
    else if (game.state === 'paused') game.state = 'flying';
  }
  if (consumePressed(input, 'r')) {
    if (game.state === 'crashed' || game.state === 'landed' || game.state === 'complete' || game.state === 'paused') {
      startMission(game.missionIndex);
    }
  }
  if (consumePressed(input, 'm')) {
    audio.muted = !audio.muted;
    if (!audio.muted) ensureAudio(audio);
  }
  if (game.state === 'menu') {
    if (consumePressed(input, '1')) startMission(0);
    if (consumePressed(input, '2')) startMission(1);
    if (consumePressed(input, '3')) startMission(2);
    if (consumePressed(input, 'enter') || consumePressed(input, ' ')) startMission(game.missionIndex);
  }
}

function handleMenuClick(event) {
  if (game.state !== 'menu') return;
  const rect = canvas.getBoundingClientRect();
  const y = event.clientY - rect.top;
  const x = event.clientX - rect.left;
  MISSIONS.forEach((mission, index) => {
    const rowY = 392 + index * 62;
    if (x > 340 && x < 940 && y > rowY - 24 && y < rowY + 30) {
      startMission(index);
    }
  });
}
canvas.addEventListener('click', handleMenuClick);

function drawMenu() {
  ctx.save();
  ctx.fillStyle = 'rgba(6, 10, 18, 0.62)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  // A clean dark band over the instrument panel so the menu's own text sits
  // on a plain background instead of over the gauges.
  ctx.fillStyle = '#0a0d12';
  ctx.fillRect(0, PANEL_Y, CANVAS_WIDTH, CANVAS_HEIGHT - PANEL_Y);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd23e';
  ctx.font = 'bold 64px ui-monospace, monospace';
  ctx.shadowColor = '#000';
  ctx.shadowBlur = 12;
  ctx.fillText('SKYLINE COURIER', CANVAS_WIDTH / 2, 118);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#e8eef5';
  ctx.font = '20px ui-monospace, monospace';
  ctx.fillText('A 2D flight game — rings, runways, fuel and bad decisions', CANVAS_WIDTH / 2, 156);
  ctx.font = '15px ui-monospace, monospace';
  ctx.fillStyle = '#9fb2c8';
  ctx.fillText('Fly the valley. Thread the rings. Mind the fuel. Land it like you mean it.', CANVAS_WIDTH / 2, 186);

  ctx.textAlign = 'left';
  MISSIONS.forEach((mission, index) => {
    const rowY = 392 + index * 62;
    const selected = index === game.missionIndex;
    ctx.fillStyle = selected ? 'rgba(255, 210, 62, 0.16)' : 'rgba(10, 16, 26, 0.55)';
    ctx.fillRect(340, rowY - 24, 600, 52);
    ctx.strokeStyle = selected ? '#ffd23e' : '#3a4250';
    ctx.lineWidth = selected ? 2 : 1;
    ctx.strokeRect(340, rowY - 24, 600, 52);
    ctx.fillStyle = '#e8eef5';
    ctx.font = 'bold 19px ui-monospace, monospace';
    ctx.fillText(`${index + 1}  ${mission.name.toUpperCase()}`, 362, rowY + 2);
    ctx.fillStyle = '#9fb2c8';
    ctx.font = '14px ui-monospace, monospace';
    ctx.fillText(mission.subtitle, 362, rowY + 22);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#7ef0ff';
    ctx.fillText(`${mission.rings.length} RINGS${mission.needsLanding ? ' + LANDING' : ''}`, 918, rowY + 2);
    ctx.textAlign = 'left';
  });

  ctx.textAlign = 'center';
  ctx.fillStyle = '#c8d4e2';
  ctx.font = '15px ui-monospace, monospace';
  ctx.fillText('ARROWS / WASD — pitch & bank      SHIFT — throttle up      CTRL — throttle down', CANVAS_WIDTH / 2, 606);
  ctx.fillText('MOUSE — steer toward the cursor      HOLD CLICK — boost      P — pause      R — restart      M — mute', CANVAS_WIDTH / 2, 632);
  ctx.fillStyle = '#ffd23e';
  ctx.font = 'bold 17px ui-monospace, monospace';
  ctx.fillText('CLICK A MISSION OR PRESS 1 / 2 / 3 TO FLY', CANVAS_WIDTH / 2, 668);
  ctx.restore();
}

function drawEndOverlay(title, titleColor, lines) {
  ctx.save();
  ctx.fillStyle = 'rgba(6, 10, 18, 0.72)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.textAlign = 'center';
  ctx.fillStyle = titleColor;
  ctx.font = 'bold 52px ui-monospace, monospace';
  ctx.fillText(title, CANVAS_WIDTH / 2, 250);
  ctx.fillStyle = '#e8eef5';
  ctx.font = '20px ui-monospace, monospace';
  lines.forEach((line, i) => {
    ctx.fillText(line, CANVAS_WIDTH / 2, 310 + i * 34);
  });
  ctx.fillStyle = '#ffd23e';
  ctx.font = 'bold 17px ui-monospace, monospace';
  ctx.fillText('PRESS R TO FLY AGAIN — OR 1 / 2 / 3 FOR ANOTHER MISSION', CANVAS_WIDTH / 2, 310 + lines.length * 34 + 30);
  ctx.restore();
}

function render(timeSec) {
  const plane = game.plane;
  // The horizon slides with pitch so climbs and dives read in the world.
  game.camera.pitchScreen = clamp(-plane.pitch * 2.2, -52, 52);
  drawWorld(ctx, game.mission.palette, timeSec, game.camera, plane);
  drawRings(ctx, game.course, plane, PALETTES[game.mission.palette], game.camera);
  if (game.state === 'flying' || game.state === 'paused') {
    drawNextRingGuide(ctx, game.course, plane, PALETTES[game.mission.palette]);
  }
  drawAeroplane(ctx, plane, timeSec);
  drawHud(ctx, plane, game.mission, game.course, game.timeLeft, plane.score, game.message);
  drawInstruments(ctx, plane, game.mission, game.course, game.timeLeft);

  if (game.state === 'menu') drawMenu();
  if (game.state === 'paused') {
    drawEndOverlay('PAUSED', '#e8eef5', ['Take a breath. The valley will wait.', `Score so far: ${plane.score}`]);
  }
  if (game.state === 'crashed') {
    drawEndOverlay('CRASHED', '#ff5a4e', [
      game.crashText || 'THE VALLEY WINS THIS TIME',
      `Rings cleared: ${plane.ringsCleared}/${game.course.length}    Score: ${plane.score}`,
      `Fuel left: ${Math.round(plane.fuel)}%    Airframe: ${Math.round(100 - plane.damage)}%`,
    ]);
  }
  if (game.state === 'landed') {
    drawEndOverlay('TOUCHDOWN — DELIVERED', '#37e08a', [
      'A clean landing on runway 27. The mail is on time.',
      `Landing bonus +${ECONOMY.landingScore}    Time bonus +${game.timeBonus || 0}`,
      `Final score: ${plane.score}`,
    ]);
  }
  if (game.state === 'complete') {
    drawEndOverlay('MISSION COMPLETE', '#37e08a', [
      `Every ring threaded. ${plane.ringsCleared}/${game.course.length} rings, ${plane.ringsMissed} missed.`,
      `Time bonus +${game.timeBonus || 0}`,
      `Final score: ${plane.score}`,
    ]);
  }
}

let lastTime = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  handleKeys();
  update(dt);
  render(now / 1000);
  endFrame(input);
  requestAnimationFrame(frame);
}

// Boot: a ?shot= URL presets a photogenic moment for screenshots;
// otherwise the title screen opens over a self-flying valley.
const shot = shotFromUrl();
if (!applyShot(game, shot)) {
  game.state = 'menu';
  game.plane = createPlane();
  game.course = buildCourse(game.mission);
}
requestAnimationFrame(frame);
