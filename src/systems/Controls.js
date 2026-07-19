import Phaser from 'phaser';

// Merges phone tilt and keyboard into one smoothed steering axis [-1, 1].
// Keyboard wins while held so the game is always playable without a phone.
export class Controls {
  constructor(scene, link) {
    this.keys = scene.input.keyboard.addKeys('LEFT,RIGHT,A,D');
    this.phoneAxis = 0;
    this.value = 0;

    this._onAxis = (v) => {
      this.phoneAxis = Phaser.Math.Clamp(v, -1, 1);
    };
    link.on('axis', this._onAxis);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => link.off('axis', this._onAxis));
  }

  update(dt) {
    let target = 0;
    if (this.keys.LEFT.isDown || this.keys.A.isDown) target -= 1;
    if (this.keys.RIGHT.isDown || this.keys.D.isDown) target += 1;
    if (target === 0) target = this.phoneAxis;
    this.value += (target - this.value) * Math.min(1, 14 * dt);
    return this.value;
  }
}
