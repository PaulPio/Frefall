import Phaser from 'phaser';
import {
  W, H, SHAFT_L, SHAFT_R, PPM, GEM_VALUE, ZONE_METERS, STORE_BEST,
  fallSpeed, steerSpeed, difficulty,
} from '../const.js';
import { paletteAt } from '../systems/Palette.js';
import { Controls } from '../systems/Controls.js';
import { ObstacleSpawner } from '../systems/ObstacleSpawner.js';
import { Player } from '../objects/Player.js';

const FONT = 'Arial Black, Arial, sans-serif';

export class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  create() {
    this.link = this.registry.get('link');
    this.synth = this.registry.get('synth');

    this.elapsed = 0;
    this.gems = 0;
    this.zone = 0;
    this.alive = true;
    this.paused = false;

    // background grid scrolls with parallax; panels mask the sides
    this.bg = this.add.tileSprite(W / 2, H / 2, W, H, 'grid').setScrollFactor(0).setAlpha(0.3).setDepth(-10);
    this.add.rectangle(SHAFT_L / 2, H / 2, SHAFT_L, H, 0x000000, 0.55).setScrollFactor(0).setDepth(10);
    this.add.rectangle(SHAFT_R + SHAFT_L / 2, H / 2, W - SHAFT_R, H, 0x000000, 0.55).setScrollFactor(0).setDepth(10);
    this.wallL = this.add.rectangle(SHAFT_L - 3, H / 2, 6, H, 0xffffff).setScrollFactor(0).setDepth(11);
    this.wallR = this.add.rectangle(SHAFT_R + 3, H / 2, 6, H, 0xffffff).setScrollFactor(0).setDepth(11);

    // manual speed-line streaks (screen-space, upward = the world rushing past)
    this.streaks = [];
    for (let i = 0; i < 14; i++) {
      const side = i % 2 === 0;
      const img = this.add
        .image(side ? Phaser.Math.Between(SHAFT_L + 10, SHAFT_L + 70) : Phaser.Math.Between(SHAFT_R - 70, SHAFT_R - 10), Phaser.Math.Between(0, H), 'streak')
        .setScrollFactor(0)
        .setDepth(1)
        .setAlpha(0);
      this.streaks.push({ img, f: Phaser.Math.FloatBetween(0.8, 1.5) });
    }

    this.player = new Player(this);
    this.spawner = new ObstacleSpawner(this);
    this.controls = new Controls(this, this.link);

    // ---- HUD ----
    const label = (x, y, txt) =>
      this.add.text(x, y, txt, { fontFamily: FONT, fontSize: '16px', color: '#667099' }).setOrigin(0.5).setScrollFactor(0).setDepth(20);
    const value = (x, y, size) =>
      this.add.text(x, y, '', { fontFamily: FONT, fontSize: size, color: '#ffffff' }).setOrigin(0.5).setScrollFactor(0).setDepth(20);

    label(190, 90, 'DEPTH');
    this.depthText = value(190, 135, '52px');
    label(W - 190, 90, 'SCORE');
    this.scoreText = value(W - 190, 135, '52px');
    label(W - 190, 210, 'GEMS');
    this.gemText = value(W - 190, 245, '30px');
    label(190, 210, 'BEST');
    this.best = Number(localStorage.getItem(STORE_BEST) || 0);
    this.bestText = value(190, 245, '30px');
    this.bestText.setText(String(this.best));
    this.phoneText = this.add
      .text(W - 190, H - 40, '', { fontFamily: FONT, fontSize: '16px', color: '#667099' })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(20);

    // ---- disconnect overlay ----
    this.overlay = this.add.container(0, 0).setScrollFactor(0).setDepth(30).setVisible(false);
    this.overlay.add(this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.7));
    this.overlay.add(
      this.add.text(W / 2, H / 2 - 40, 'PHONE DISCONNECTED', { fontFamily: FONT, fontSize: '44px', color: '#ff5d7a' }).setOrigin(0.5)
    );
    this.overlay.add(
      this.add
        .text(W / 2, H / 2 + 30, 'waiting for it to come back…\npress any key to keep going with the keyboard', {
          fontFamily: FONT,
          fontSize: '20px',
          color: '#aabbdd',
          align: 'center',
          lineSpacing: 8,
        })
        .setOrigin(0.5)
    );

    // ---- link + keyboard wiring ----
    const onDisc = () => {
      if (!this.alive) return;
      this.paused = true;
      this.overlay.setVisible(true);
    };
    const onConn = () => this._resume();
    const onTap = () => this._resume();
    this.link.on('disconnected', onDisc);
    this.link.on('connected', onConn);
    this.link.on('tap', onTap);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.link.off('disconnected', onDisc);
      this.link.off('connected', onConn);
      this.link.off('tap', onTap);
    });

    this.input.keyboard.on('keydown', (e) => {
      if (e.key === 'm' || e.key === 'M') {
        this.synth.toggleMute();
        return;
      }
      if (e.key === 'Escape') {
        this.scene.start('Menu');
        return;
      }
      this._resume();
    });

    this.cameras.main.fadeIn(250, 0, 0, 0);
  }

  _resume() {
    if (this.paused && this.alive) {
      this.paused = false;
      this.overlay.setVisible(false);
    }
  }

  update(time, delta) {
    if (!this.alive || this.paused) return;
    const dt = Math.min(delta, 50) / 1000;
    this.elapsed += dt;

    const speed = fallSpeed(this.elapsed);
    const steer = steerSpeed(speed);
    const norm = Phaser.Math.Clamp((speed - 300) / 1100, 0, 1);
    const axis = this.controls.update(dt);

    this.player.move(axis * steer * dt, speed * dt, axis, dt);
    this.player.setSpeedFeel(norm);

    const cam = this.cameras.main;
    cam.scrollY = this.player.y - 260;
    cam.setZoom(1 - norm * 0.06); // subtle zoom-out as speed climbs
    this.bg.tilePositionY = cam.scrollY * 0.5;

    // speed-line streaks
    for (const s of this.streaks) {
      s.img.setAlpha(norm < 0.15 ? 0 : (norm - 0.15) * 0.5);
      s.img.scaleY = 1 + norm * 2.5;
      s.img.y -= speed * 1.35 * s.f * dt;
      if (s.img.y < -40) s.img.y = H + 40;
    }

    const depth = this.player.y / PPM;

    // hue-shifting world
    const pal = paletteAt(depth);
    cam.setBackgroundColor(pal.bg);
    this.bg.setTint(pal.grid);
    this.wallL.setFillStyle(pal.wall);
    this.wallR.setFillStyle(pal.wall);
    this.player.setTint(pal.player);
    this.spawner.tint(pal);
    this.depthText.setTint(pal.text);
    this.scoreText.setTint(pal.text);
    this.gemText.setTint(pal.gem);

    // zone milestone every 500 m
    const nz = Math.floor(depth / ZONE_METERS);
    if (nz > this.zone) {
      this.zone = nz;
      cam.flash(220, 255, 255, 255, false);
      this.synth.zone();
    }

    this.spawner.update(this.elapsed, dt, cam.scrollY, cam.scrollY + H, difficulty(this.elapsed));

    // gems
    for (const gem of this.spawner.collect(this.player.x, this.player.y)) {
      this.gems++;
      this.synth.gem();
      const txt = this.add
        .text(gem.x, gem.y, `+${GEM_VALUE}`, { fontFamily: FONT, fontSize: '22px', color: '#ffffff' })
        .setOrigin(0.5)
        .setDepth(8)
        .setTint(pal.gem);
      this.tweens.add({ targets: txt, y: gem.y - 60, alpha: 0, duration: 600, onComplete: () => txt.destroy() });
    }

    // death
    if (this.spawner.collide(this.player.rect())) {
      this._die(depth, pal);
      return;
    }

    this.synth.setIntensity(norm);

    const total = Math.floor(depth) + this.gems * GEM_VALUE;
    this.depthText.setText(`${Math.floor(depth)}m`);
    this.scoreText.setText(String(total));
    this.gemText.setText(String(this.gems));
    this.phoneText.setText(this.link.connected ? '● phone linked' : '○ keyboard').setColor(this.link.connected ? '#6dff9e' : '#667099');
  }

  _die(depth, pal) {
    this.alive = false;
    this.synth.death();
    this.synth.setIntensity(0.05);
    this.player.explode(pal.player);
    this.cameras.main.shake(300, 0.012);
    this.cameras.main.flash(200, 255, 60, 90, false);

    const total = Math.floor(depth) + this.gems * GEM_VALUE;
    const newBest = total > this.best;
    if (newBest) localStorage.setItem(STORE_BEST, String(total));

    this.time.delayedCall(800, () => {
      this.scene.launch('GameOver', {
        depth: Math.floor(depth),
        gems: this.gems,
        total,
        best: newBest ? total : this.best,
        newBest,
      });
      this.scene.pause();
    });
  }
}
