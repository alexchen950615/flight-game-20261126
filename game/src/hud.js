// Skyline Courier — the cockpit: aeroplane, HUD and lit instruments.
// One file, one job: everything drawn on top of the world. The chase-view
// aeroplane sits centre-frame and banks with the flight model; below it a
// dark instrument panel carries a glowing attitude ball, compass tape, speed
// and altitude tapes, fuel, damage and throttle gauges; above it the HUD
// reads altitude, speed and heading in plain numbers.

import { CANVAS_WIDTH, CANVAS_HEIGHT, ECONOMY } from './config.js';
import { clamp, degToRad, wrapAngleDeg } from './random.js';

const PANEL_Y = 596;
const PLANE_X = CANVAS_WIDTH / 2;
const PLANE_Y = 468;

// The aeroplane seen from behind and slightly above: fuselage, swept wings,
// tail fin, canopy glint and red/green navigation lights. It banks with the
// flight model and bobs a touch with the shake of a damaged airframe.
export function drawAeroplane(ctx, plane, timeSec) {
  const bankRad = degToRad(plane.bank);
  const shakeX = plane.shake > 0 ? Math.sin(timeSec * 47) * plane.shake * 5 : 0;
  const shakeY = plane.shake > 0 ? Math.cos(timeSec * 39) * plane.shake * 4 : 0;
  const pitchLift = -plane.pitch * 0.9;
  ctx.save();
  ctx.translate(PLANE_X + shakeX, PLANE_Y + pitchLift + shakeY);
  ctx.rotate(bankRad * 0.55);
  ctx.scale(1, 0.94);

  // Engine glow first, so the body paints over it.
  const glow = ctx.createRadialGradient(0, 26, 2, 0, 26, 34);
  glow.addColorStop(0, 'rgba(255, 190, 90, 0.6)');
  glow.addColorStop(1, 'rgba(255, 190, 90, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 26, 34, 0, Math.PI * 2);
  ctx.fill();

  // Wings: broad, slightly swept, with a pale leading edge.
  ctx.fillStyle = '#c8ccd4';
  ctx.beginPath();
  ctx.moveTo(-14, 6);
  ctx.lineTo(-138, 34);
  ctx.lineTo(-132, 46);
  ctx.lineTo(-12, 26);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(14, 6);
  ctx.lineTo(138, 34);
  ctx.lineTo(132, 46);
  ctx.lineTo(12, 26);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#f4f6f8';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-14, 6);
  ctx.lineTo(-138, 34);
  ctx.moveTo(14, 6);
  ctx.lineTo(138, 34);
  ctx.stroke();

  // Fuselage: a tapered body with a shaded belly and a lit canopy.
  const body = ctx.createLinearGradient(-16, 0, 16, 0);
  body.addColorStop(0, '#8d939e');
  body.addColorStop(0.5, '#e8ebef');
  body.addColorStop(1, '#7c828d');
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(0, -64);
  ctx.quadraticCurveTo(15, -30, 15, 8);
  ctx.quadraticCurveTo(15, 30, 7, 40);
  ctx.lineTo(-7, 40);
  ctx.quadraticCurveTo(-15, 30, -15, 8);
  ctx.quadraticCurveTo(-15, -30, 0, -64);
  ctx.fill();
  ctx.fillStyle = '#2b4a6b';
  ctx.beginPath();
  ctx.ellipse(0, -34, 8, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(180, 220, 255, 0.75)';
  ctx.beginPath();
  ctx.ellipse(-2, -38, 3, 8, -0.3, 0, Math.PI * 2);
  ctx.fill();

  // Tail fin and stabilisers.
  ctx.fillStyle = '#b7bcc5';
  ctx.beginPath();
  ctx.moveTo(0, 18);
  ctx.lineTo(0, -18);
  ctx.lineTo(9, 16);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#9aa0aa';
  ctx.beginPath();
  ctx.moveTo(-6, 26);
  ctx.lineTo(-52, 40);
  ctx.lineTo(-48, 46);
  ctx.lineTo(-4, 34);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(6, 26);
  ctx.lineTo(52, 40);
  ctx.lineTo(48, 46);
  ctx.lineTo(4, 34);
  ctx.closePath();
  ctx.fill();

  // Navigation lights: red left, green right, blinking white strobe.
  const strobe = Math.sin(timeSec * 6) > 0.6;
  ctx.fillStyle = '#ff3b30';
  ctx.beginPath();
  ctx.arc(-136, 40, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#30e05a';
  ctx.beginPath();
  ctx.arc(136, 40, 4, 0, Math.PI * 2);
  ctx.fill();
  if (strobe) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 42, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function panelBackground(ctx) {
  const g = ctx.createLinearGradient(0, PANEL_Y, 0, CANVAS_HEIGHT);
  g.addColorStop(0, '#14181f');
  g.addColorStop(1, '#0a0d12');
  ctx.fillStyle = g;
  ctx.fillRect(0, PANEL_Y, CANVAS_WIDTH, CANVAS_HEIGHT - PANEL_Y);
  ctx.fillStyle = '#2a2f38';
  ctx.fillRect(0, PANEL_Y, CANVAS_WIDTH, 2);
}

function gaugeLabel(ctx, x, y, text) {
  ctx.fillStyle = '#8fa3b8';
  ctx.font = '10px ui-monospace, monospace';
  ctx.textAlign = 'center';
  ctx.fillText(text, x, y);
}

// The attitude ball: a sky/ground disc that rolls with bank and slides with
// pitch, ringed by a lit bezel.
function drawAttitude(ctx, plane) {
  const cx = 200;
  const cy = PANEL_Y + 62;
  const r = 46;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.translate(cx, cy);
  ctx.rotate(degToRad(plane.bank));
  const pitchPx = clamp(plane.pitch, -24, 24) * 1.4;
  ctx.fillStyle = '#3f8fd2';
  ctx.fillRect(-r - 2, -r - 2 - pitchPx, r * 2 + 4, r + 2 + pitchPx);
  ctx.fillStyle = '#8a6a3f';
  ctx.fillRect(-r - 2, -pitchPx, r * 2 + 4, r + 2 + pitchPx);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-r, -pitchPx);
  ctx.lineTo(r, -pitchPx);
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = '#d7dee8';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  // Fixed wings marker: the aeroplane symbol never moves, the world does.
  ctx.fillStyle = '#ffd23e';
  ctx.beginPath();
  ctx.moveTo(cx - 26, cy);
  ctx.lineTo(cx - 8, cy);
  ctx.lineTo(cx + 8, cy);
  ctx.lineTo(cx + 26, cy);
  ctx.lineTo(cx + 22, cy + 4);
  ctx.lineTo(cx + 8, cy + 4);
  ctx.lineTo(cx - 8, cy + 4);
  ctx.lineTo(cx - 22, cy + 4);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy, 3, 0, Math.PI * 2);
  ctx.fill();
  gaugeLabel(ctx, cx, cy + r + 16, 'ATTITUDE');
}

// A scrolling tape: the current value centred, neighbours fading above and
// below, with a lit readout box in the middle.
function drawTape(ctx, x, y, height, value, step, unit, label, format) {
  const w = 92;
  const half = height / 2;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x - w / 2, y - half, w, height);
  ctx.clip();
  ctx.fillStyle = 'rgba(10, 14, 20, 0.85)';
  ctx.fillRect(x - w / 2, y - half, w, height);
  ctx.font = '12px ui-monospace, monospace';
  ctx.textAlign = 'right';
  const pxPerUnit = height / (step * 6);
  const base = Math.floor(value / step) * step;
  for (let v = base - step * 3; v <= base + step * 3; v += step) {
    const dy = y - (v - value) * pxPerUnit;
    const major = v % (step * 5) === 0;
    ctx.strokeStyle = major ? '#c8d4e2' : '#5a6a7c';
    ctx.lineWidth = major ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(x + w / 2 - 14, dy);
    ctx.lineTo(x + w / 2 - (major ? 4 : 8), dy);
    ctx.stroke();
    if (major) {
      ctx.fillStyle = '#c8d4e2';
      ctx.fillText(format(v), x + w / 2 - 18, dy + 4);
    }
  }
  ctx.restore();
  ctx.strokeStyle = '#d7dee8';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x - w / 2, y - half, w, height);
  ctx.fillStyle = '#10151d';
  ctx.fillRect(x - w / 2 - 6, y - 13, w + 12, 26);
  ctx.strokeStyle = '#ffd23e';
  ctx.lineWidth = 2;
  ctx.strokeRect(x - w / 2 - 6, y - 13, w + 12, 26);
  ctx.fillStyle = '#ffd23e';
  ctx.font = 'bold 16px ui-monospace, monospace';
  ctx.textAlign = 'center';
  ctx.fillText(format(value) + unit, x, y + 6);
  gaugeLabel(ctx, x, y + half + 15, label);
}

function drawCompass(ctx, plane) {
  const cx = CANVAS_WIDTH / 2;
  const cy = PANEL_Y + 26;
  const w = 420;
  ctx.save();
  ctx.beginPath();
  ctx.rect(cx - w / 2, cy - 16, w, 32);
  ctx.clip();
  ctx.fillStyle = 'rgba(10, 14, 20, 0.85)';
  ctx.fillRect(cx - w / 2, cy - 16, w, 32);
  const pxPerDeg = w / 120;
  const heading = wrapAngleDeg(plane.heading);
  const points = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  for (let d = -120; d <= 120; d += 5) {
    const hdg = wrapAngleDeg(heading + d);
    const x = cx + d * pxPerDeg;
    const major = ((hdg % 30) + 360) % 30 === 0;
    ctx.strokeStyle = major ? '#c8d4e2' : '#5a6a7c';
    ctx.lineWidth = major ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(x, cy + (major ? 2 : 8));
    ctx.lineTo(x, cy + 14);
    ctx.stroke();
    if (major) {
      const label = points[Math.round(((hdg % 360) + 360) % 360 / 45) % 8];
      ctx.fillStyle = '#c8d4e2';
      ctx.font = 'bold 12px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(label, x, cy - 2);
    }
  }
  ctx.restore();
  ctx.strokeStyle = '#d7dee8';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(cx - w / 2, cy - 16, w, 32);
  ctx.fillStyle = '#ffd23e';
  ctx.beginPath();
  ctx.moveTo(cx, cy - 18);
  ctx.lineTo(cx - 6, cy - 28);
  ctx.lineTo(cx + 6, cy - 28);
  ctx.closePath();
  ctx.fill();
  gaugeLabel(ctx, cx, cy + 30, 'HEADING');
}

function drawBarGauge(ctx, x, y, w, value, max, color, label, warnAt) {
  ctx.fillStyle = '#0c0f14';
  ctx.fillRect(x, y, w, 12);
  ctx.strokeStyle = '#3a4250';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, 12);
  const frac = clamp(value / max, 0, 1);
  const warn = value <= warnAt;
  ctx.fillStyle = warn && Math.sin(Date.now() / 180) > 0 ? '#ff3b30' : color;
  ctx.fillRect(x + 1, y + 1, Math.max(0, (w - 2) * frac), 10);
  gaugeLabel(ctx, x + w / 2, y + 26, label);
}

export function drawHud(ctx, plane, mission, course, timeLeft, score, message) {
  // Top bar: altitude, speed and heading as big plain numbers.
  ctx.save();
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(8, 12, 18, 0.55)';
  ctx.fillRect(14, 12, 330, 100);
  ctx.fillStyle = '#e8eef5';
  ctx.font = 'bold 26px ui-monospace, monospace';
  ctx.fillText(`ALT ${Math.max(0, Math.round(plane.altitude))} ft`, 26, 42);
  ctx.fillText(`SPD ${Math.round(plane.speed)} kt`, 26, 72);
  ctx.fillStyle = '#ffd23e';
  ctx.font = 'bold 20px ui-monospace, monospace';
  ctx.fillText(`HDG ${String(Math.round(((plane.heading % 360) + 360) % 360)).padStart(3, '0')}°`, 26, 96);
  ctx.restore();

  // Top right: mission, score and the clock.
  ctx.save();
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(8, 12, 18, 0.55)';
  ctx.fillRect(CANVAS_WIDTH - 344, 12, 330, 100);
  ctx.fillStyle = '#e8eef5';
  ctx.font = 'bold 18px ui-monospace, monospace';
  ctx.fillText(mission.name.toUpperCase(), CANVAS_WIDTH - 26, 40);
  ctx.fillStyle = '#7ef0ff';
  ctx.font = 'bold 22px ui-monospace, monospace';
  ctx.fillText(`SCORE ${score}`, CANVAS_WIDTH - 26, 68);
  const mins = Math.floor(Math.max(0, timeLeft) / 60);
  const secs = Math.floor(Math.max(0, timeLeft) % 60);
  ctx.fillStyle = timeLeft < 30 ? '#ff5a4e' : '#e8eef5';
  ctx.font = 'bold 18px ui-monospace, monospace';
  ctx.fillText(`TIME ${mins}:${String(secs).padStart(2, '0')}`, CANVAS_WIDTH - 26, 94);
  ctx.restore();

  // Centre flash message (ring cleared, warning, landing callouts).
  if (message && message.text) {
    ctx.save();
    ctx.globalAlpha = clamp(message.alpha, 0, 1);
    ctx.textAlign = 'center';
    ctx.font = 'bold 30px ui-monospace, monospace';
    ctx.fillStyle = message.color;
    ctx.shadowColor = message.color;
    ctx.shadowBlur = 18;
    ctx.fillText(message.text, CANVAS_WIDTH / 2, 168);
    ctx.restore();
  }
}

export function drawInstruments(ctx, plane, mission, course, timeLeft) {
  panelBackground(ctx);
  drawAttitude(ctx, plane);
  drawCompass(ctx, plane);
  drawTape(ctx, 1080, PANEL_Y + 62, 92, plane.speed, 20, ' kt', 'AIRSPEED', (v) => String(Math.round(v)));
  drawTape(ctx, 1210, PANEL_Y + 62, 92, plane.altitude, 100, ' ft', 'ALTITUDE', (v) => String(Math.round(v)));

  // Fuel, damage and throttle bars under the compass.
  drawBarGauge(ctx, 470, PANEL_Y + 62, 150, plane.fuel, 100, '#37e08a', 'FUEL', 20);
  drawBarGauge(ctx, 470, PANEL_Y + 88, 150, ECONOMY.maxDamage - plane.damage, ECONOMY.maxDamage, '#ff9f43', 'AIRFRAME', 25);
  drawBarGauge(ctx, 700, PANEL_Y + 62, 150, plane.throttle * 100, 100, '#19d3ff', 'THROTTLE', -1);
  ctx.save();
  ctx.fillStyle = '#8fa3b8';
  ctx.font = '11px ui-monospace, monospace';
  ctx.textAlign = 'left';
  const cleared = course.filter((r) => r.state === 'cleared' || r.state === 'clipped').length;
  ctx.fillText(`RINGS ${cleared}/${course.length}`, 700, PANEL_Y + 100);
  ctx.fillText(mission.needsLanding ? 'LAND ON RUNWAY 27' : 'THREAD EVERY RING', 700, PANEL_Y + 116);
  ctx.restore();

  // Low fuel / low airframe warnings blink on the panel itself.
  if (plane.fuel < 20 || plane.damage > 75) {
    ctx.save();
    ctx.fillStyle = Math.sin(Date.now() / 150) > 0 ? '#ff3b30' : '#7a1410';
    ctx.font = 'bold 15px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(plane.fuel < 20 ? 'LOW FUEL' : 'AIRFRAME CRITICAL', 545, PANEL_Y + 34);
    ctx.restore();
  }
}
