export const W = 1280;
export const H = 720;

// the falling shaft, centered on the canvas
export const SHAFT_W = 520;
export const SHAFT_L = (W - SHAFT_W) / 2; // 380
export const SHAFT_R = SHAFT_L + SHAFT_W; // 900

export const PPM = 20; // pixels per meter of depth

export const PLAYER_SIZE = 44;

// continuous acceleration: gentle first ~30s, then a steeper asymptotic climb
export function fallSpeed(t) {
  if (t < 30) return 300 + 5 * t; // 300 -> 450
  return 450 + 950 * (1 - Math.exp(-(t - 30) / 60)); // -> ~1400, never quite
}

// steering scales with fall speed so the cube stays controllable
export function steerSpeed(speed) {
  return 150 + speed * 0.95;
}

// 0..1 difficulty knob for the spawner (time-based, matches the speed curve feel)
export function difficulty(t) {
  if (t < 30) return 0.12 * (t / 30);
  return Math.min(1, 0.12 + (t - 30) / 140);
}

export const GEM_VALUE = 25;
export const ZONE_METERS = 500;

export const STORE_BEST = 'freefall.best';
export const STORE_MUTED = 'freefall.muted';
