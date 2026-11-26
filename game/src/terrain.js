// Skyline Courier — terrain, sky and the perspective projector.
// One file, one job: everything the world looks like. The projector turns a
// world point (lateral metres, altitude feet, distance ahead) into screen
// pixels; the painters draw sky, ridges, fields, the river, the road and the
// runway through it. Nothing here knows about missions or input.

import { CANVAS_WIDTH, CANVAS_HEIGHT, HORIZON_Y, FOCAL_LENGTH, WORLD, PALETTES } from './config.js';
import { clamp, hash2, lerp } from './random.js';

// Rolling hills: two slow sine ridges plus a valley bowl so the ground rises
// toward the edges of the valley and the strip stays flat.
export function terrainHeightAt(wx, wz) {
  const bowl = Math.pow(clamp(Math.abs(wx) / WORLD.valleyHalfWidth, 0, 1), 2) * 46;
  const ridge = Math.sin(wx * WORLD.terrainScale + wz * 0.004) * 9
    + Math.sin(wz * 0.0021 + 1.7) * 7
    + Math.sin((wx + wz) * 0.0013) * 5;
  const nearStrip = Math.abs(wx) < WORLD.runway.halfWidth + 26
    && wz > WORLD.runway.zStart - 260 && wz < WORLD.runway.zEnd + 260;
  return nearStrip ? 0 : Math.max(0, bowl + ridge + WORLD.hillHeight * 0.12);
}

// The river snakes down the east side of the valley.
export function riverCentreX(wz) {
  return 190 + Math.sin(wz * 0.0009) * 90 + Math.sin(wz * 0.0023) * 30;
}

// Project a world point into screen space. dz is metres ahead of the camera,
// dy is feet above the camera. Returns null when the point is behind us.
export function project(dx, dyFeet, dz, camera) {
  if (dz < 8) return null;
  const scale = FOCAL_LENGTH / dz;
  const horizon = HORIZON_Y + camera.pitchScreen;
  return {
    x: CANVAS_WIDTH / 2 + dx * scale,
    y: horizon - dyFeet * scale * 0.3048,
    scale,
  };
}

// Simpler ground projection: a point on the ground plane at lateral dx and
// distance dz ahead of the camera, which sits cameraAlt feet up.
export function projectGround(dx, dz, cameraAltFeet, camera) {
  if (dz < 8) return null;
  const scale = FOCAL_LENGTH / dz;
  const horizon = HORIZON_Y + camera.pitchScreen;
  const groundDrop = cameraAltFeet * 0.3048;
  return {
    x: CANVAS_WIDTH / 2 + dx * scale,
    y: horizon + groundDrop * scale,
    scale,
  };
}

function drawSky(ctx, palette, timeSec, camera) {
  const g = ctx.createLinearGradient(0, 0, 0, HORIZON_Y + 40);
  g.addColorStop(0, palette.skyTop);
  g.addColorStop(0.55, palette.skyMid);
  g.addColorStop(1, palette.skyLow);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, CANVAS_WIDTH, HORIZON_Y + 40);

  // Low sun with a soft halo, sitting just above the ridge line.
  const sunX = CANVAS_WIDTH * 0.72;
  const sunY = HORIZON_Y - 66;
  const halo = ctx.createRadialGradient(sunX, sunY, 4, sunX, sunY, 150);
  halo.addColorStop(0, palette.sunGlow);
  halo.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(sunX - 150, sunY - 150, 300, 300);
  ctx.fillStyle = palette.sun;
  ctx.beginPath();
  ctx.arc(sunX, sunY, 26, 0, Math.PI * 2);
  ctx.fill();

  drawClouds(ctx, palette, timeSec, camera);
}

function drawClouds(ctx, palette, timeSec, camera) {
  ctx.save();
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
  for (let i = 0; i < 9; i++) {
    const drift = ((i * 173 + timeSec * (6 + i * 1.5)) % 1500) - 110;
    const cx = drift;
    const cy = 52 + (i % 4) * 42 + Math.sin(i * 2.4) * 14;
    const s = 26 + (i % 3) * 14;
    ctx.beginPath();
    ctx.ellipse(cx, cy, s * 1.9, s * 0.55, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + s, cy + 5, s * 1.2, s * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function ridgeLine(ctx, seed, baseY, amp, color, parallax) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, HORIZON_Y + 2);
  for (let x = 0; x <= CANVAS_WIDTH; x += 32) {
    const h = Math.sin((x * 0.006 + seed) * 1.7) * amp
      + Math.sin((x * 0.013 + seed * 2.3)) * amp * 0.45;
    ctx.lineTo(x, baseY - Math.abs(h) * parallax);
  }
  ctx.lineTo(CANVAS_WIDTH, HORIZON_Y + 2);
  ctx.closePath();
  ctx.fill();
}

// Paint one ground slice (a quad between two distances ahead of the plane)
// so the field grid reads as a patchwork valley floor receding to the
// horizon. Distances are relative to the aeroplane; the absolute world
// distance (plane.z + dz) seeds the patchwork so the fields scroll past as
// the aeroplane flies forward instead of staying glued to the camera.
function paintGroundSlice(ctx, palette, zNear, zFar, camera, plane) {
  const camAlt = plane.altitude;
  const absZFar = plane.z + zFar;
  const corners = (dz) => {
    const left = projectGround(-WORLD.valleyHalfWidth, dz, camAlt, camera);
    const right = projectGround(WORLD.valleyHalfWidth, dz, camAlt, camera);
    if (!left || !right) return null;
    return { left, right };
  };
  const n = corners(zNear);
  const f = corners(zFar);
  if (!n || !f) return;
  // Base wash for the whole strip, then the patchwork cells on top.
  const shade = clamp(1 - zFar / 5200, 0.25, 1);
  ctx.fillStyle = shadeColor(palette.groundFar, palette.groundNear, shade);
  ctx.beginPath();
  ctx.moveTo(n.left.x, n.left.y);
  ctx.lineTo(n.right.x, n.right.y);
  ctx.lineTo(f.right.x, f.right.y);
  ctx.lineTo(f.left.x, f.left.y);
  ctx.closePath();
  ctx.fill();

  const cellW = 84;
  const ix0 = Math.floor((-WORLD.valleyHalfWidth - plane.x) / cellW);
  const ix1 = Math.floor((WORLD.valleyHalfWidth - plane.x) / cellW);
  for (let ix = ix0; ix <= ix1; ix++) {
    const wx0 = ix * cellW;
    const wx1 = wx0 + cellW;
    const roll = hash2(ix, Math.round(absZFar / 200), WORLD.seed);
    const isRiver = Math.abs((wx0 + wx1) / 2 - riverCentreX(absZFar)) < 34;
    const isForest = roll > 0.86;
    const p0 = projectGround(wx0 - plane.x, zNear, camAlt, camera);
    const p1 = projectGround(wx1 - plane.x, zNear, camAlt, camera);
    const p2 = projectGround(wx1 - plane.x, zFar, camAlt, camera);
    const p3 = projectGround(wx0 - plane.x, zFar, camAlt, camera);
    if (!p0 || !p1 || !p2 || !p3) continue;
    if (isRiver) ctx.fillStyle = '#4f7fa8';
    else if (isForest) ctx.fillStyle = '#3d5c33';
    else ctx.fillStyle = palette.fieldColors[Math.floor(roll * palette.fieldColors.length) % palette.fieldColors.length];
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.lineTo(p3.x, p3.y);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
    // A few trees in forest cells, drawn as dots that grow as we close in.
    if (isForest && zFar < 2600) {
      ctx.fillStyle = '#2c4a26';
      for (let t = 0; t < 3; t++) {
        const tx = wx0 + 14 + hash2(ix * 3 + t, Math.round(absZFar / 200), 7) * (cellW - 28);
        const tp = projectGround(tx - plane.x, zFar - 40 - t * 30, camAlt, camera);
        if (tp) {
          ctx.beginPath();
          ctx.arc(tp.x, tp.y, Math.max(1.5, 5 * tp.scale), 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }
}

function shadeColor(far, near, t) {
  const pf = parseHex(far);
  const pn = parseHex(near);
  const r = Math.round(lerp(pf[0], pn[0], t));
  const g = Math.round(lerp(pf[1], pn[1], t));
  const b = Math.round(lerp(pf[2], pn[2], t));
  return `rgb(${r},${g},${b})`;
}

function parseHex(hex) {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}

// The road runs the length of the valley on the west side; the runway is a
// flat grey strip with threshold bars and a dashed centreline.
function paintRoadAndRunway(ctx, palette, camera, plane) {
  const camAlt = plane.altitude;
  const roadX = -260;
  const roadHalf = 7;
  for (let z = 200; z < 5200; z += 200) {
    const a = projectGround(roadX - roadHalf - plane.x, z, camAlt, camera);
    const b = projectGround(roadX + roadHalf - plane.x, z, camAlt, camera);
    const c = projectGround(roadX + roadHalf - plane.x, z + 200, camAlt, camera);
    const d = projectGround(roadX - roadHalf - plane.x, z + 200, camAlt, camera);
    if (!a || !b || !c || !d) continue;
    ctx.fillStyle = z % 400 === 0 ? '#5a5348' : '#4a443c';
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.lineTo(c.x, c.y);
    ctx.lineTo(d.x, d.y);
    ctx.closePath();
    ctx.fill();
  }

  const rw = WORLD.runway;
  // The strip is fixed in the world; measure it as distance ahead of the
  // aeroplane so it grows as we close in instead of sitting at the horizon.
  const rwDz0 = rw.zStart - plane.z;
  const rwDz1 = rw.zEnd - plane.z;
  const strip = (z0, z1, fill) => {
    const a = projectGround(-rw.halfWidth - plane.x, z0, camAlt, camera);
    const b = projectGround(rw.halfWidth - plane.x, z0, camAlt, camera);
    const c = projectGround(rw.halfWidth - plane.x, z1, camAlt, camera);
    const d = projectGround(-rw.halfWidth - plane.x, z1, camAlt, camera);
    if (!a || !b || !c || !d) return;
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.lineTo(c.x, c.y);
    ctx.lineTo(d.x, d.y);
    ctx.closePath();
    ctx.fill();
  };
  // Runway body, sliced so the far end still reads through the haze.
  for (let dz = Math.max(rwDz0, 12); dz < rwDz1; dz += 100) {
    strip(dz, Math.min(dz + 100, rwDz1), dz % 200 === 0 ? '#3c3f45' : '#34373d');
  }
  // White threshold bars at both ends.
  if (rwDz0 > 12) strip(rwDz0, rwDz0 + 24, '#e8e8e8');
  if (rwDz1 > 36) strip(rwDz1 - 24, rwDz1, '#e8e8e8');
  // Dashed centreline: a thin quad down the middle of the strip.
  for (let dz = Math.max(rwDz0 + 60, 12); dz < rwDz1 - 60; dz += 90) {
    const p0 = projectGround(-2 - plane.x, dz, camAlt, camera);
    const p1 = projectGround(2 - plane.x, dz, camAlt, camera);
    const p2 = projectGround(2 - plane.x, dz + 45, camAlt, camera);
    const p3 = projectGround(-2 - plane.x, dz + 45, camAlt, camera);
    if (p0 && p1 && p2 && p3) {
      ctx.fillStyle = '#f2f2f2';
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.lineTo(p3.x, p3.y);
      ctx.closePath();
      ctx.fill();
    }
  }
}

export function drawWorld(ctx, paletteName, timeSec, camera, plane) {
  const palette = PALETTES[paletteName];
  drawSky(ctx, palette, timeSec, camera);
  ridgeLine(ctx, 3.1, HORIZON_Y + 2, 52, palette.mountainFar, 1);
  ridgeLine(ctx, 7.7, HORIZON_Y + 2, 34, palette.mountainNear, 0.7);

  // Full-width ground base, horizon to bottom, so the valley floor meets the
  // sky across the whole frame even where the patchwork narrows to a point.
  const base = ctx.createLinearGradient(0, HORIZON_Y, 0, CANVAS_HEIGHT);
  base.addColorStop(0, palette.groundFar);
  base.addColorStop(1, palette.groundNear);
  ctx.fillStyle = base;
  ctx.fillRect(0, HORIZON_Y + 1, CANVAS_WIDTH, CANVAS_HEIGHT - HORIZON_Y);

  // Ground: far-to-near slices so nearer paint covers farther.
  const slices = [];
  for (let z = 5200; z > 120; z -= 200) slices.push(z);
  for (const zFar of slices) paintGroundSlice(ctx, palette, Math.max(zFar - 200, 12), zFar, camera, plane);
  paintRoadAndRunway(ctx, palette, camera, plane);
}
