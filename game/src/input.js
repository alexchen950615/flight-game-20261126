// Skyline Courier — keyboard and mouse input.
// One file, one job: turn raw device events into one control frame per tick:
// pitch -1..1, bank -1..1, throttle -1..1, plus edge-triggered actions
// (pause, restart, mission select, mute) the game loop consumes.

export function createInput() {
  return {
    keys: new Set(),
    mouseX: 0.5, // 0..1 across the canvas
    mouseY: 0.5,
    mouseActive: false,
    mouseDown: false,
    pressed: new Set(), // keys pressed since last consume
  };
}

export function attachInput(input, canvas) {
  window.addEventListener('keydown', (event) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) {
      event.preventDefault();
    }
    if (!event.repeat) input.pressed.add(event.key.toLowerCase());
    input.keys.add(event.key.toLowerCase());
  });
  window.addEventListener('keyup', (event) => {
    input.keys.delete(event.key.toLowerCase());
  });
  canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    input.mouseX = (event.clientX - rect.left) / rect.width;
    input.mouseY = (event.clientY - rect.top) / rect.height;
    input.mouseActive = true;
  });
  canvas.addEventListener('mousedown', () => {
    input.mouseDown = true;
  });
  window.addEventListener('mouseup', () => {
    input.mouseDown = false;
  });
  canvas.addEventListener('mouseleave', () => {
    input.mouseActive = false;
  });
}

// Read the current control frame. Keyboard wins when it is held; otherwise
// the mouse steers: left/right of centre banks, above/below centre pitches.
export function readControls(input) {
  const keys = input.keys;
  let pitch = 0;
  let bank = 0;
  let throttle = 0;
  if (keys.has('arrowup') || keys.has('w')) pitch += 1;
  if (keys.has('arrowdown') || keys.has('s')) pitch -= 1;
  if (keys.has('arrowleft') || keys.has('a')) bank -= 1;
  if (keys.has('arrowright') || keys.has('d')) bank += 1;
  if (keys.has('shift')) throttle += 1;
  if (keys.has('control') || keys.has('c')) throttle -= 1;
  if (pitch === 0 && bank === 0 && input.mouseActive) {
    const dead = 0.06;
    const mx = input.mouseX - 0.5;
    const my = input.mouseY - 0.5;
    if (Math.abs(mx) > dead) bank = Math.max(-1, Math.min(1, mx * 2.4));
    if (Math.abs(my) > dead) pitch = Math.max(-1, Math.min(1, -my * 2.4));
  }
  if (input.mouseDown) throttle += 0.6;
  return { pitch, bank, throttle };
}

// True once for a key pressed since the last call; the game loop calls this
// every frame for the action keys it cares about.
export function consumePressed(input, key) {
  const hit = input.pressed.has(key);
  if (hit) input.pressed.delete(key);
  return hit;
}

export function endFrame(input) {
  input.pressed.clear();
}
