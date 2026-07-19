import Phaser from 'phaser';

// Depth-driven neon palette. The whole world's hue drifts as you fall —
// ~45° per 500 m zone, a full cycle every ~4000 m.
export function paletteAt(depthM) {
  const hue = (195 + depthM * 0.09) % 360;
  const mk = (dh, s, l) => Phaser.Display.Color.HSLToColor((((hue + dh) % 360) / 360), s, l).color;
  return {
    bg: mk(0, 0.55, 0.05),
    grid: mk(0, 0.7, 0.4),
    wall: mk(0, 0.95, 0.6),
    obstacle: mk(185, 0.95, 0.62),
    player: mk(75, 1, 0.68),
    gem: mk(40, 1, 0.62),
    text: mk(0, 0.85, 0.82),
    dim: mk(0, 0.3, 0.45),
  };
}
