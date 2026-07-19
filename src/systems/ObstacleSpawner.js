import Phaser from 'phaser';
import { SHAFT_L, SHAFT_R, SHAFT_W } from '../const.js';

const R = Phaser.Math.Between;
const F = Phaser.Math.FloatBetween;
const lerp = Phaser.Math.Linear;

// Procedural hazard chunks spawned below the camera, recycled above it.
// Collision is pure geometry (no physics bodies): rects, circles, and a
// spinning line — all checked against the player's shrunk rect.
export class ObstacleSpawner {
  constructor(scene) {
    this.scene = scene;
    this.obstacles = [];
    this.gems = [];
    this.nextY = 800; // first hazard well below the start
    this.lastGapX = (SHAFT_L + SHAFT_R) / 2;
  }

  update(t, dt, camTop, camBottom, d) {
    while (this.nextY < camBottom + 500) {
      this._spawnChunk(this.nextY, d);
      this.nextY += lerp(560, 330, d) + R(0, 60);
    }

    for (const o of this.obstacles) {
      if (o.kind === 'spin') {
        o.angle += o.omega * dt;
        o.sprite.rotation = o.angle;
      } else if (o.kind === 'saw') {
        if (o.amp > 0) o.sprite.x = o.baseX + Math.sin(t * o.freq + o.phase) * o.amp;
        o.sprite.rotation += 6 * dt;
      }
    }
    for (const gem of this.gems) {
      gem.sprite.y = gem.baseY + Math.sin(t * 3 + gem.phase) * 6;
      gem.sprite.rotation += 1.5 * dt;
    }

    this._recycle(camTop - 250);
  }

  _recycle(aboveY) {
    const alive = (arr) =>
      arr.filter((o) => {
        if (o.sprite.y < aboveY) {
          o.sprite.destroy();
          return false;
        }
        return true;
      });
    this.obstacles = alive(this.obstacles);
    this.gems = alive(this.gems);
  }

  // ---------- spawning ----------

  _spawnChunk(y, d) {
    const wSpike = 0.35;
    const wZig = 0.3;
    const wStatic = 0.18 * (1 - d);
    const wSpin = d > 0.1 ? 0.22 * Math.min(1, (d - 0.1) * 4) : 0;
    const wSlide = d > 0.15 ? 0.25 * Math.min(1, (d - 0.15) * 4) : 0;
    let r = Math.random() * (wSpike + wZig + wStatic + wSpin + wSlide);
    if ((r -= wSpike) < 0) return this._spikeRow(y, d);
    if ((r -= wZig) < 0) return this._wallZig(y, d);
    if ((r -= wStatic) < 0) return this._sawStatic(y, d);
    if ((r -= wSpin) < 0) return this._spinner(y, d);
    return this._sawSlide(y, d);
  }

  // keep consecutive gaps steer-reachable at current speeds
  _pickGap(gapW, d) {
    const reach = 240 + (1 - d) * 200;
    const min = SHAFT_L + gapW / 2 + 24;
    const max = SHAFT_R - gapW / 2 - 24;
    const x = Phaser.Math.Clamp(this.lastGapX + F(-reach, reach), min, max);
    this.lastGapX = x;
    return x;
  }

  _addRect(sprite, hw, hh) {
    this.obstacles.push({ sprite, kind: 'rect', hw, hh });
  }

  _addGem(x, y) {
    const sprite = this.scene.add.image(x, y, 'gem').setDepth(2);
    this.gems.push({ sprite, baseY: y, phase: F(0, 6.28) });
  }

  _spikeRow(y, d) {
    const gapW = lerp(300, 160, d);
    const gapX = this._pickGap(gapW, d);
    const flip = Math.random() < 0.35; // some rows point down
    for (let x = SHAFT_L + 24; x < SHAFT_R; x += 46) {
      if (Math.abs(x - gapX) < gapW / 2) continue;
      const s = this.scene.add.image(x, y, 'spike').setDepth(2);
      if (flip) s.setFlipY(true);
      this._addRect(s, 11, 13);
    }
    if (Math.random() < 0.55) this._addGem(gapX, y);
  }

  _barRow(y, gapX, gapW) {
    const leftLen = gapX - gapW / 2 - SHAFT_L;
    const rightLen = SHAFT_R - (gapX + gapW / 2);
    if (leftLen > 8) {
      const s = this.scene.add.image(SHAFT_L + leftLen / 2, y, 'block').setDepth(2).setDisplaySize(leftLen, 22);
      this._addRect(s, leftLen / 2, 11);
    }
    if (rightLen > 8) {
      const s = this.scene.add.image(SHAFT_R - rightLen / 2, y, 'block').setDepth(2).setDisplaySize(rightLen, 22);
      this._addRect(s, rightLen / 2, 11);
    }
  }

  _wallZig(y, d) {
    const gapW = lerp(280, 165, d);
    const sep = 190 + d * 130;
    const gap1 = this._pickGap(gapW, d);
    // second gap shifted a bounded distance — forces a readable zigzag
    const shift = F(120, 220) * (Math.random() < 0.5 ? -1 : 1);
    const min = SHAFT_L + gapW / 2 + 24;
    const max = SHAFT_R - gapW / 2 - 24;
    const gap2 = Phaser.Math.Clamp(gap1 + shift, min, max);
    this._barRow(y, gap1, gapW);
    this._barRow(y + sep, gap2, gapW);
    this.lastGapX = gap2;
    this.nextY += sep; // chunk is taller than a single row
    if (Math.random() < 0.6) this._addGem((gap1 + gap2) / 2, y + sep / 2);
  }

  _spinner(y, d) {
    const x = R(SHAFT_L + 140, SHAFT_R - 140);
    const sprite = this.scene.add.image(x, y, 'bar').setDepth(2);
    this.obstacles.push({
      sprite,
      kind: 'spin',
      angle: F(0, 3.14),
      omega: (1.1 + d * 1.7) * (Math.random() < 0.5 ? -1 : 1),
      halfLen: 116,
    });
    const side = x < (SHAFT_L + SHAFT_R) / 2 ? SHAFT_R - 60 : SHAFT_L + 60;
    if (Math.random() < 0.5) this._addGem(side, y);
  }

  _sawSlide(y, d) {
    const baseX = (SHAFT_L + SHAFT_R) / 2;
    const sprite = this.scene.add.image(baseX, y, 'saw').setDepth(2);
    this.obstacles.push({
      sprite,
      kind: 'saw',
      baseX,
      amp: SHAFT_W / 2 - 64,
      freq: 1.1 + d * 1.4,
      phase: F(0, 6.28),
      r: 26,
    });
    if (Math.random() < 0.5) this._addGem(Math.random() < 0.5 ? SHAFT_L + 46 : SHAFT_R - 46, y);
  }

  _sawStatic(y, d) {
    const onLeft = Math.random() < 0.5;
    const x = onLeft ? SHAFT_L + 52 : SHAFT_R - 52;
    const sprite = this.scene.add.image(x, y, 'saw').setDepth(2);
    this.obstacles.push({ sprite, kind: 'saw', baseX: x, amp: 0, freq: 0, phase: 0, r: 26 });
    if (Math.random() < 0.5) this._addGem(onLeft ? SHAFT_R - 120 : SHAFT_L + 120, y + 20);
  }

  // ---------- queries ----------

  collide(playerRect) {
    const py = playerRect.centerY;
    for (const o of this.obstacles) {
      if (Math.abs(o.sprite.y - py) > 300) continue;
      if (o.kind === 'rect') {
        const r = new Phaser.Geom.Rectangle(o.sprite.x - o.hw, o.sprite.y - o.hh, o.hw * 2, o.hh * 2);
        if (Phaser.Geom.Intersects.RectangleToRectangle(r, playerRect)) return true;
      } else if (o.kind === 'saw') {
        const c = new Phaser.Geom.Circle(o.sprite.x, o.sprite.y, o.r);
        if (Phaser.Geom.Intersects.CircleToRectangle(c, playerRect)) return true;
      } else if (o.kind === 'spin') {
        const dx = Math.cos(o.angle) * o.halfLen;
        const dy = Math.sin(o.angle) * o.halfLen;
        const line = new Phaser.Geom.Line(o.sprite.x - dx, o.sprite.y - dy, o.sprite.x + dx, o.sprite.y + dy);
        if (Phaser.Geom.Intersects.LineToRectangle(line, playerRect)) return true;
      }
    }
    return false;
  }

  // returns positions of gems collected this frame
  collect(px, py) {
    const got = [];
    this.gems = this.gems.filter((gem) => {
      const d = Phaser.Math.Distance.Between(px, py, gem.sprite.x, gem.sprite.y);
      if (d < 40) {
        got.push({ x: gem.sprite.x, y: gem.sprite.y });
        gem.sprite.destroy();
        return false;
      }
      return true;
    });
    return got;
  }

  tint(pal) {
    for (const o of this.obstacles) o.sprite.setTint(pal.obstacle);
    for (const gem of this.gems) gem.sprite.setTint(pal.gem);
  }
}
