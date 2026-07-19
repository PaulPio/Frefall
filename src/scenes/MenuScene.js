import Phaser from 'phaser';
import QRCode from 'qrcode';
import { W, H, STORE_BEST } from '../const.js';
import { paletteAt } from '../systems/Palette.js';

const FONT = 'Arial Black, Arial, sans-serif';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create() {
    const link = this.registry.get('link');
    const synth = this.registry.get('synth');
    const pal = paletteAt(0);

    this.cameras.main.setBackgroundColor(pal.bg);
    this.add.tileSprite(W / 2, H / 2, W, H, 'grid').setAlpha(0.25).setTint(pal.grid);

    const title = this.add
      .text(W / 2, 140, 'FREEFALL', {
        fontFamily: FONT,
        fontSize: '96px',
        color: '#ffffff',
        letterSpacing: 18,
      })
      .setOrigin(0.5)
      .setTint(pal.player);
    this.tweens.add({ targets: title, scale: 1.04, duration: 900, yoyo: true, repeat: -1, ease: 'sine.inout' });
    this.add
      .text(W / 2, 210, 'an ever-accelerating descent', { fontFamily: FONT, fontSize: '20px', color: '#8899cc' })
      .setOrigin(0.5);

    const best = Number(localStorage.getItem(STORE_BEST) || 0);
    if (best > 0) {
      this.add
        .text(W / 2, 258, `BEST  ${best}`, { fontFamily: FONT, fontSize: '26px', color: '#ffffff' })
        .setOrigin(0.5)
        .setTint(pal.gem);
    }

    // left column: how to play
    this.add
      .text(200, 400, 'TILT  YOUR  PHONE\nTO  STEER', {
        fontFamily: FONT,
        fontSize: '30px',
        color: '#ffffff',
        align: 'center',
        lineSpacing: 10,
      })
      .setOrigin(0.5)
      .setTint(pal.wall);
    this.add
      .text(200, 490, 'dodge everything\ngrab the gems\nyou only fall faster', {
        fontFamily: FONT,
        fontSize: '18px',
        color: '#8899cc',
        align: 'center',
        lineSpacing: 8,
      })
      .setOrigin(0.5);
    this.add
      .text(200, 590, 'or play with  ←  →  /  A  D', { fontFamily: FONT, fontSize: '18px', color: '#667099' })
      .setOrigin(0.5);

    // right column: QR pairing card
    const card = this.add.graphics();
    card.fillStyle(0xe8f2ff, 1);
    card.fillRoundedRect(W - 200 - 140, 330, 280, 280, 16);
    this.qrImage = null;
    this.codeText = this.add
      .text(W - 200, 640, '', { fontFamily: FONT, fontSize: '22px', color: '#ffffff', letterSpacing: 6 })
      .setOrigin(0.5)
      .setTint(pal.wall);

    this.statusText = this.add
      .text(W / 2, H - 40, 'press an arrow key to play', { fontFamily: FONT, fontSize: '22px', color: '#ffffff' })
      .setOrigin(0.5)
      .setTint(pal.text);

    this.add
      .text(W - 200, 300, 'SCAN TO USE YOUR PHONE', { fontFamily: FONT, fontSize: '16px', color: '#8899cc' })
      .setOrigin(0.5);

    this.add.text(16, H - 30, 'M mute', { fontFamily: FONT, fontSize: '14px', color: '#556' });

    // ---- link wiring (cleaned up on shutdown) ----
    const onReady = (code) => this._showQR(code);
    const onConnected = () => {
      this.statusText.setText('✔ PHONE LINKED — tap your phone to drop').setTint(0x6dff9e);
      synth.ui();
    };
    const onDisconnected = () => {
      this.statusText.setText('phone lost — rescan, or press an arrow key').setTint(0xff5d7a);
    };
    const onNetError = () => {
      this.statusText.setText('phone link unavailable (offline?) — keyboard only').setTint(0xffd24d);
    };
    const onTap = () => this._start();

    link.on('ready', onReady);
    link.on('connected', onConnected);
    link.on('disconnected', onDisconnected);
    link.on('net-error', onNetError);
    link.on('tap', onTap);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      link.off('ready', onReady);
      link.off('connected', onConnected);
      link.off('disconnected', onDisconnected);
      link.off('net-error', onNetError);
      link.off('tap', onTap);
    });

    if (link.code && link.peer?.open) this._showQR(link.code);
    if (link.connected) onConnected();

    this.input.keyboard.on('keydown', (e) => {
      if (e.key === 'm' || e.key === 'M') {
        synth.toggleMute();
        return;
      }
      if (['ArrowLeft', 'ArrowRight', 'a', 'd', 'A', 'D', ' ', 'Enter'].includes(e.key)) this._start();
    });
  }

  _showQR(code) {
    const url = new URL(location.href);
    url.searchParams.set('room', code);
    window.__room = code; // testing hook
    this.codeText.setText(`CODE ${code}`);
    QRCode.toDataURL(url.toString(), {
      width: 256,
      margin: 1,
      color: { dark: '#04050d', light: '#e8f2ff' },
    }).then((dataUrl) => {
      const key = 'qr-' + code;
      if (this.textures.exists(key)) {
        this._placeQR(key);
      } else {
        this.textures.once('addtexture-' + key, () => this._placeQR(key));
        this.textures.addBase64(key, dataUrl);
      }
    });
  }

  _placeQR(key) {
    if (!this.scene.isActive()) return;
    if (this.qrImage) this.qrImage.destroy();
    this.qrImage = this.add.image(W - 200, 470, key).setDisplaySize(256, 256);
  }

  _start() {
    if (this._starting) return;
    this._starting = true;
    this.registry.get('synth').ui();
    this.cameras.main.fadeOut(250, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Game'));
  }
}
