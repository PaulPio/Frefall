// Role router: same build serves both screens.
// ?room=XXXX  -> phone controller page (no Phaser loaded)
// otherwise   -> desktop game
const room = new URLSearchParams(location.search).get('room');

if (room) {
  import('./controller.js').then((m) => m.startController(room.toUpperCase()));
} else {
  import('./game.js').then((m) => m.startGame());
}
