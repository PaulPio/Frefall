import Phaser from 'phaser';
import { PLAYER_SIZE, SHAFT_L, SHAFT_R } from '../const.js';

// The falling neon cube. Movement is integrated manually by GameScene;
// this class owns the sprite, its trail, and the (forgiving) hitbox.
export class Player {
  constructor(scene) {
    this.scene = scene;
    this.sprite = scene.add.image(SHAFT_L + (SHAFT_R - SHAFT_L) / 2, 0, 'player').setDepth(5);
    this.glow = scene.add.image(this.sprite.x, this.sprite.y, 'glow').setDepth(4).setScale(2.2).setAlpha(0.8);

    this.trail = scene.add.particles(0, 0, 'dot', {
      speed: { min: 5, max: 30 },
      angle: { min: 250, max: 290 }, // drift upward, behind the fall
      scale: { start: 0.9, end: 0 },
      alpha: { start: 0.7, end: 0 },
      lifespan: 350,
      frequency: 35,
      follow: this.sprite,
      followOffset: { x: 0, y: -PLAYER_SIZE / 2 },
    });
    this.trail.setDepth(3);
  }

  get x() {
    return this.sprite.x;
  }
  get y() {
    return this.sprite.y;
  }

  move(dx, dy, axis, dt) {
    const half = PLAYER_SIZE / 2;
    this.sprite.x = Phaser.Math.Clamp(this.sprite.x + dx, SHAFT_L + half, SHAFT_R - half);
    this.sprite.y += dy;
    // lean into the steer
    const targetRot = axis * 0.35;
    this.sprite.rotation += (targetRot - this.sprite.rotation) * Math.min(1, 12 * dt);
    this.glow.setPosition(this.sprite.x, this.sprite.y);
  }

  // trail stretches as speed climbs — the fall has to be FELT
  setSpeedFeel(norm) {
    this.trail.frequency = 35 - norm * 27;
    this.trail.lifespan = 350 + norm * 450;
  }

  setTint(color) {
    this.sprite.setTint(color);
    this.glow.setTint(color);
    this.trail.setParticleTint(color);
  }

  // shrunk hitbox — Geometry Dash-style forgiveness
  rect() {
    const s = PLAYER_SIZE * 0.68;
    return new Phaser.Geom.Rectangle(this.sprite.x - s / 2, this.sprite.y - s / 2, s, s);
  }

  pauseTrail() {
    this.trail.stop();
  }

  resumeTrail() {
    this.trail.start();
  }

  explode(color) {
    this.trail.stop();
    this.sprite.setVisible(false);
    this.glow.setVisible(false);
    const burst = this.scene.add.particles(this.sprite.x, this.sprite.y, 'dot', {
      speed: { min: 120, max: 420 },
      scale: { start: 1.3, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 700,
      quantity: 40,
      emitting: false,
    });
    burst.setDepth(8).setParticleTint(color);
    burst.explode(40);
  }
}
