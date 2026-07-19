import Phaser from 'phaser';
import { PLAYER_SIZE } from '../const.js';

// All art is generated here, in white/gray, and tinted at runtime by the
// depth-driven palette.
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    const gen = (key, w, h) => {
      g.generateTexture(key, w, h);
      g.clear();
    };

    // player cube: neon outline + face
    const s = PLAYER_SIZE;
    g.fillStyle(0xffffff, 0.18);
    g.fillRoundedRect(3, 3, s - 6, s - 6, 9);
    g.lineStyle(4, 0xffffff, 1);
    g.strokeRoundedRect(3, 3, s - 6, s - 6, 9);
    g.fillStyle(0xffffff, 1);
    g.fillRect(12, 14, 7, 7);
    g.fillRect(s - 19, 14, 7, 7);
    g.fillRect(14, s - 16, s - 28, 4);
    gen('player', s, s);

    // spike (points up)
    g.fillStyle(0xffffff, 0.22);
    g.lineStyle(3, 0xffffff, 1);
    g.beginPath();
    g.moveTo(24, 3);
    g.lineTo(45, 45);
    g.lineTo(3, 45);
    g.closePath();
    g.fillPath();
    g.strokePath();
    gen('spike', 48, 48);

    // block (walls / bars) — drawn big so the stroke stays crisp when scaled
    g.fillStyle(0xffffff, 0.2);
    g.fillRect(2, 2, 116, 20);
    g.lineStyle(3, 0xffffff, 1);
    g.strokeRect(2, 2, 116, 20);
    gen('block', 120, 24);

    // rotating bar
    g.fillStyle(0xffffff, 0.25);
    g.fillRoundedRect(2, 2, 236, 14, 7);
    g.lineStyle(3, 0xffffff, 1);
    g.strokeRoundedRect(2, 2, 236, 14, 7);
    gen('bar', 240, 18);

    // saw blade
    g.lineStyle(3, 0xffffff, 1);
    g.strokeCircle(32, 32, 28);
    g.strokeCircle(32, 32, 9);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      g.lineBetween(32 + Math.cos(a) * 9, 32 + Math.sin(a) * 9, 32 + Math.cos(a) * 28, 32 + Math.sin(a) * 28);
    }
    g.fillStyle(0xffffff, 0.12);
    g.fillCircle(32, 32, 28);
    gen('saw', 64, 64);

    // gem
    g.fillStyle(0xffffff, 0.35);
    g.lineStyle(3, 0xffffff, 1);
    g.beginPath();
    g.moveTo(14, 2);
    g.lineTo(26, 14);
    g.lineTo(14, 26);
    g.lineTo(2, 14);
    g.closePath();
    g.fillPath();
    g.strokePath();
    g.lineStyle(1, 0xffffff, 0.7);
    g.lineBetween(14, 2, 14, 26);
    g.lineBetween(2, 14, 26, 14);
    gen('gem', 28, 28);

    // particle dot
    g.fillStyle(0xffffff, 1);
    g.fillCircle(4, 4, 4);
    gen('dot', 8, 8);

    // speed-line streak
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, 3, 26);
    gen('streak', 3, 26);

    // background grid tile (seamless: one line on left + top edge)
    g.lineStyle(1, 0xffffff, 1);
    g.lineBetween(0, 0, 0, 80);
    g.lineBetween(0, 0, 80, 0);
    gen('grid', 80, 80);

    // soft glow blob
    for (let r = 30; r > 2; r -= 2) {
      g.fillStyle(0xffffff, 0.028);
      g.fillCircle(32, 32, r);
    }
    gen('glow', 64, 64);

    g.destroy();
    this.scene.start('Menu');
  }
}
