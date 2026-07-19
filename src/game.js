import Phaser from 'phaser';
import { W, H } from './const.js';
import { Link, makeCode } from './net/Link.js';
import { Synth } from './audio/Synth.js';
import { BootScene } from './scenes/BootScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { GameScene } from './scenes/GameScene.js';
import { GameOverScene } from './scenes/GameOverScene.js';

export function startGame() {
  const link = new Link();
  link.host(makeCode());

  const synth = new Synth();

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'app',
    width: W,
    height: H,
    backgroundColor: '#04050d',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [BootScene, MenuScene, GameScene, GameOverScene],
  });

  game.registry.set('link', link);
  game.registry.set('synth', synth);

  // browsers block audio until a user gesture
  const unlock = () => {
    synth.unlock();
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);

  // testing hooks (harmless in prod)
  window.__link = link;
  window.__game = game;
}
