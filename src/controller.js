import { Link } from './net/Link.js';

// Phone controller page — plain DOM, no Phaser. Tilt streams a steering
// axis to the desktop at ~30 Hz; touch-drag works as a fallback/override.
export function startController(room) {
  document.body.classList.add('controller');

  const app = document.getElementById('app');
  const ctl = document.createElement('div');
  ctl.className = 'ctl';

  const h1 = document.createElement('h1');
  h1.textContent = 'FREEFALL';

  const codeEl = document.createElement('div');
  codeEl.className = 'code';
  codeEl.textContent = `CODE ${room}`;

  const statusEl = document.createElement('div');
  statusEl.className = 'status';
  statusEl.id = 'status';
  statusEl.textContent = 'connecting…';

  const tiltwrap = document.createElement('div');
  tiltwrap.className = 'tiltwrap';
  const dotEl = document.createElement('div');
  dotEl.className = 'tiltdot';
  dotEl.id = 'tiltdot';
  tiltwrap.appendChild(dotEl);

  const hint = document.createElement('div');
  hint.className = 'hint';
  hint.append(
    document.createTextNode('hold your phone upright and tilt left / right to steer'),
    document.createElement('br'),
    document.createTextNode('or drag a finger across the screen')
  );

  const btn = document.createElement('button');
  btn.id = 'go';
  btn.textContent = 'TAP TO PLAY';

  ctl.append(h1, codeEl, statusEl, tiltwrap, hint, btn);
  app.replaceChildren(ctl);

  const setStatus = (text, cls = '') => {
    statusEl.textContent = text;
    statusEl.className = 'status ' + cls;
  };

  const link = new Link();
  let failed = false;

  link.on('connected', () => {
    failed = false;
    setStatus('linked to game ✔', 'ok');
    if (started) btn.textContent = 'TAP = START / RETRY';
    else btn.textContent = 'TAP TO PLAY';
  });
  link.on('disconnected', () => {
    failed = false;
    setStatus('link lost — reconnecting…', 'bad');
  });
  link.on('failed', (why) => {
    failed = true;
    setStatus(why, 'bad');
    btn.textContent = 'TAP TO RETRY LINK';
  });
  link.join(room);

  // ---- steering state ----
  let tiltAxis = 0;
  let touchAxis = 0;
  let touching = false;
  let started = false;

  const DEAD = 3; // degrees
  const MAX = 28;

  function onOrientation(e) {
    // portrait: gamma is left/right tilt; if held landscape, beta takes over
    const angle = screen.orientation?.angle ?? 0;
    let deg;
    if (angle === 90) deg = -e.beta;
    else if (angle === 270 || angle === -90) deg = e.beta;
    else deg = e.gamma;
    if (deg == null) return;
    const mag = Math.min(Math.max(Math.abs(deg) - DEAD, 0) / (MAX - DEAD), 1);
    tiltAxis = Math.sign(deg) * Math.pow(mag, 1.2);
  }

  async function enableTilt() {
    try {
      if (typeof DeviceOrientationEvent !== 'undefined' && DeviceOrientationEvent.requestPermission) {
        const res = await DeviceOrientationEvent.requestPermission(); // iOS 13+, needs a gesture
        if (res !== 'granted') return;
      }
      window.addEventListener('deviceorientation', onOrientation);
    } catch {
      /* touch fallback still works */
    }
  }

  // touch-drag: finger x position across the screen maps to the axis, and
  // overrides tilt while a finger is down
  function touchToAxis(x) {
    const w = window.innerWidth;
    return Math.min(Math.max((x - w / 2) / (w * 0.35), -1), 1);
  }
  window.addEventListener('pointerdown', (e) => {
    if (e.target === btn) return;
    touching = true;
    touchAxis = touchToAxis(e.clientX);
  });
  window.addEventListener('pointermove', (e) => {
    if (touching) touchAxis = touchToAxis(e.clientX);
  });
  const endTouch = () => {
    touching = false;
    touchAxis = 0;
  };
  window.addEventListener('pointerup', endTouch);
  window.addEventListener('pointercancel', endTouch);

  btn.addEventListener('click', async () => {
    if (failed) {
      failed = false;
      setStatus('connecting…', '');
      btn.textContent = started ? 'TAP = START / RETRY' : 'TAP TO PLAY';
      link.retry();
      return;
    }
    if (!started) {
      started = true;
      btn.textContent = 'TAP = START / RETRY';
      await enableTilt();
      try {
        await navigator.wakeLock?.request('screen'); // keep the phone awake mid-run
      } catch {
        /* not critical */
      }
    }
    navigator.vibrate?.(30);
    link.send({ t: 'tap' });
  });

  // stream the axis at ~30 Hz and drive the on-screen indicator
  setInterval(() => {
    const axis = touching ? touchAxis : tiltAxis;
    dotEl.style.left = `${50 + axis * 40}%`;
    if (link.connected) link.send({ t: 'axis', v: Math.round(axis * 1000) / 1000 });
  }, 33);
}
