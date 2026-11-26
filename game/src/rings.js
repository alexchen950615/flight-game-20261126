// Skyline Courier — the ring course.
// One file, one job: build a mission's rings from its waypoints, draw them
// in perspective, and judge each one as the aeroplane flies past it.

import { RING_RADIUS, ECONOMY } from './config.js';
import { project } from './terrain.js';

export function buildCourse(mission) {
  return mission.rings.map((ring, index) => ({
    index,
    x: ring.x,
    alt: ring.alt,
    z: ring.z,
    state: 'pending', // pending | cleared | clipped | missed
    centreError: null,
  }));
}

export function nextRing(course) {
  return course.find((ring) => ring.state === 'pending') ?? null;
}

// A ring is judged the moment the aeroplane's nose passes its plane.
export function judgeRings(course, plane, onEvent) {
  for (const ring of course) {
    if (ring.state !== 'pending') continue;
    if (plane.z < ring.z) continue;
    const dx = plane.x - ring.x;
    const dy = (plane.altitude - ring.alt) * 0.3048; // feet -> metres
    const error = Math.hypot(dx, dy);
    ring.centreError = error;
    if (error <= RING_RADIUS) {
      ring.state = 'cleared';
      plane.ringsCleared += 1;
      const bonus = error < RING_RADIUS * 0.45 ? ECONOMY.centreBonus : 0;
      plane.score += ECONOMY.ringScore + bonus;
      onEvent({ type: 'ring', ring, bonus });
    } else if (error <= RING_RADIUS * 1.6) {
      ring.state = 'clipped';
      plane.ringsCleared += 1;
      plane.damage += ECONOMY.clipDamage;
      plane.shake = 1;
      plane.score += 40;
      onEvent({ type: 'clip', ring });
      if (plane.damage >= ECONOMY.maxDamage) {
        plane.crashed = true;
        plane.crashReason = 'airframe';
      }
    } else {
      ring.state = 'missed';
      plane.ringsMissed += 1;
      onEvent({ type: 'miss', ring });
    }
  }
}

export function drawRings(ctx, course, plane, palette, camera) {
  // Far rings first so near ones paint over them.
  const visible = course.filter((ring) => ring.z - plane.z > 10 && ring.z - plane.z < 5200);
  visible.sort((a, b) => b.z - a.z);
  for (const ring of visible) {
    const dz = ring.z - plane.z;
    const centre = project(ring.x - plane.x, ring.alt - plane.altitude, dz, camera);
    if (!centre) continue;
    const radiusPx = Math.max(3, RING_RADIUS * centre.scale);
    const isNext = ring === nextRing(course);
    let color = palette.ring;
    let width = 3;
    if (ring.state === 'cleared' || ring.state === 'clipped') color = palette.ringDone;
    if (isNext) {
      color = palette.ringNext;
      width = 5;
    }
    // Glow halo, then the hoop, then the inner edge so it reads as a torus.
    ctx.save();
    ctx.globalAlpha = ring.state === 'pending' ? 0.95 : 0.45;
    ctx.strokeStyle = color;
    ctx.lineWidth = width + 7;
    ctx.globalAlpha = 0.18;
    ctx.beginPath();
    ctx.ellipse(centre.x, centre.y, radiusPx, radiusPx * 0.92, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = ring.state === 'pending' ? 0.95 : 0.45;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.ellipse(centre.x, centre.y, radiusPx, radiusPx * 0.92, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.ellipse(centre.x, centre.y, radiusPx * 0.82, radiusPx * 0.75, 0, 0, Math.PI * 2);
    ctx.stroke();
    // The next ring gets a distance tag and a chevron pointing at it.
    if (isNext) {
      const dist = Math.round(dz);
      ctx.font = 'bold 15px ui-monospace, monospace';
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.fillText(`${dist} m`, centre.x, centre.y - radiusPx - 12);
      ctx.beginPath();
      ctx.moveTo(centre.x, centre.y - radiusPx - 34);
      ctx.lineTo(centre.x - 8, centre.y - radiusPx - 22);
      ctx.lineTo(centre.x + 8, centre.y - radiusPx - 22);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
}

// A small guidance arrow at the top of the screen pointing toward the next ring.
export function drawNextRingGuide(ctx, course, plane, palette) {
  const ring = nextRing(course);
  if (!ring) return;
  const dx = ring.x - plane.x;
  const dz = ring.z - plane.z;
  const arrowX = 640 + Math.max(-420, Math.min(420, dx * 1.4));
  const arrowY = 92;
  ctx.save();
  ctx.fillStyle = palette.ringNext;
  ctx.font = 'bold 13px ui-monospace, monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`NEXT RING ${ring.index + 1}/${course.length} — ${Math.round(dz)} m AHEAD`, arrowX, arrowY - 14);
  ctx.beginPath();
  ctx.moveTo(arrowX, arrowY + 10);
  ctx.lineTo(arrowX - 9, arrowY - 4);
  ctx.lineTo(arrowX + 9, arrowY - 4);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
