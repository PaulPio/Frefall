import { isValidCode } from './net/codes.js';

// Role router: same build serves both screens.
// ?room=XXXXXX  -> phone controller page (no Phaser loaded)
// otherwise     -> desktop game
const raw = new URLSearchParams(location.search).get('room');

if (raw) {
  const room = raw.toUpperCase();
  if (!isValidCode(room)) {
    document.body.classList.add('controller');
    const app = document.getElementById('app');
    const ctl = document.createElement('div');
    ctl.className = 'ctl';
    const h1 = document.createElement('h1');
    h1.textContent = 'FREEFALL';
    const status = document.createElement('div');
    status.className = 'status bad';
    status.textContent = 'invalid room code — rescan the QR';
    ctl.append(h1, status);
    app.replaceChildren(ctl);
  } else {
    import('./controller.js').then((m) => m.startController(room));
  }
} else {
  import('./game.js').then((m) => m.startGame());
}
