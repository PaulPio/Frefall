import Phaser from 'phaser';
import { W, H } from '../const.js';
import { paletteAt } from '../systems/Palette.js';

const FONT = 'Arial Black, Arial, sans-serif';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOver');
  }

  create(data) {
    const link = this.registry.get('link');
    const synth = this.registry.get('synth');
    const pal = paletteAt(data.depth);

    this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.72);

    this.add
      .text(W / 2, 170, 'WRECKED', { fontFamily: FONT, fontSize: '84px', color: '#ffffff', letterSpacing: 14 })
      .setOrigin(0.5)
      .setTint(0xff5d7a);

    this.add
      .text(W / 2, 290, `DEPTH  ${data.depth}m      GEMS  ${data.gems}`, {
        fontFamily: FONT,
        fontSize: '28px',
        color: '#aabbdd',
      })
      .setOrigin(0.5);

    this.add
      .text(W / 2, 370, `SCORE  ${data.total}`, { fontFamily: FONT, fontSize: '56px', color: '#ffffff' })
      .setOrigin(0.5)
      .setTint(pal.text);

    if (data.newBest) {
      const nb = this.add
        .text(W / 2, 440, '★ NEW BEST ★', { fontFamily: FONT, fontSize: '32px', color: '#ffffff' })
        .setOrigin(0.5)
        .setTint(pal.gem);
      this.tweens.add({ targets: nb, scale: 1.12, duration: 400, yoyo: true, repeat: -1, ease: 'sine.inout' });
    } else {
      this.add
        .text(W / 2, 440, `BEST  ${data.best}`, { fontFamily: FONT, fontSize: '26px', color: '#8899cc' })
        .setOrigin(0.5);
    }

    const retry = this.add
      .text(W / 2, 560, 'tap your phone  /  press SPACE to drop again', {
        fontFamily: FONT,
        fontSize: '24px',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setTint(pal.player);
    this.tweens.add({ targets: retry, alpha: 0.4, duration: 600, yoyo: true, repeat: -1 });

    this.add
      .text(W / 2, 620, 'ESC for menu', { fontFamily: FONT, fontSize: '16px', color: '#667099' })
      .setOrigin(0.5);

    // small delay so a panic-tap at the moment of death doesn't instantly restart
    this.armed = false;
    this.time.delayedCall(400, () => (this.armed = true));

    const onTap = () => this._retry();
    link.on('tap', onTap);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => link.off('tap', onTap));

    this.input.keyboard.on('keydown', (e) => {
      if (e.key === 'Escape') {
        synth.ui();
        this.scene.stop('Game');
        this.scene.start('Menu');
        return;
      }
      if (e.key === 'm' || e.key === 'M') {
        synth.toggleMute();
        return;
      }
      this._retry();
    });
    this.input.on('pointerdown', () => this._retry());
  }

  _retry() {
    if (!this.armed) return;
    this.armed = false;
    this.registry.get('synth').ui();
    this.scene.stop('Game');
    this.scene.start('Game');
  }
}
