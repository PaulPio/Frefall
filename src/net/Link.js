import { Peer } from 'peerjs';

const PREFIX = 'sunjam-freefall-';
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I

export function makeCode() {
  let c = '';
  for (let i = 0; i < 4; i++) c += CODE_CHARS[(Math.random() * CODE_CHARS.length) | 0];
  return c;
}

// Tiny event emitter + PeerJS wrapper shared by both roles.
// Desktop: link.host(code)  -> emits 'ready'(code), 'connected', 'disconnected', 'axis'(v), 'tap', 'net-error'
// Phone:   link.join(code)  -> emits 'connected', 'disconnected', 'failed'
export class Link {
  constructor() {
    this.handlers = {};
    this.peer = null;
    this.conn = null;
    this.connected = false;
    this.code = null;
    this.joinRetries = 0;
    this.lastMsgAt = 0;
  }

  // WebRTC won't reliably fire 'close' when the other end dies abruptly, so
  // both sides run a silence watchdog. The phone streams axis at ~30 Hz and
  // the desktop answers with a 1 Hz heartbeat — silence means the link is dead.
  _startWatchdog(threshold) {
    return setInterval(() => {
      if (this.role === 'host') this.send({ t: 'hb' });
      if (this.connected && Date.now() - this.lastMsgAt > threshold) {
        const dead = this.conn;
        this.conn = null;
        this.connected = false;
        this.emit('disconnected');
        try {
          dead.close();
        } catch {
          /* already gone */
        }
        if (this.role === 'join') this._retryDial();
      }
    }, 1000);
  }

  on(ev, fn) {
    (this.handlers[ev] ??= []).push(fn);
  }

  off(ev, fn) {
    const h = this.handlers[ev];
    if (h) this.handlers[ev] = h.filter((f) => f !== fn);
  }

  emit(ev, ...args) {
    for (const fn of this.handlers[ev] ?? []) fn(...args);
  }

  // ---------- desktop ----------
  host(code) {
    this.role = 'host';
    this.code = code;
    if (!this._watchdog) this._watchdog = this._startWatchdog(3500);
    this.peer = new Peer(PREFIX + code);

    this.peer.on('open', () => this.emit('ready', this.code));

    this.peer.on('connection', (conn) => {
      if (this.conn) this.conn.close();
      this._wire(conn);
    });

    this.peer.on('error', (err) => {
      if (err.type === 'unavailable-id') {
        // code collision on the public PeerServer — pick a new one
        this.peer.destroy();
        this.host(makeCode());
      } else if (err.type === 'network' || err.type === 'server-error' || err.type === 'socket-error') {
        this.emit('net-error');
      }
    });

    this.peer.on('disconnected', () => {
      if (!this.peer.destroyed) this.peer.reconnect();
    });
  }

  // ---------- phone ----------
  join(code) {
    this.role = 'join';
    this.code = code;
    if (!this._watchdog) this._watchdog = this._startWatchdog(10000);
    this.peer = new Peer();
    this.peer.on('open', () => this._dial());
    this.peer.on('error', (err) => {
      if (err.type === 'peer-unavailable') this._retryDial();
      else if (err.type === 'network' || err.type === 'server-error' || err.type === 'socket-error') {
        this.emit('failed', 'no connection to link server');
      }
    });
    this.peer.on('disconnected', () => {
      if (!this.peer.destroyed) this.peer.reconnect();
    });
  }

  _dial() {
    const conn = this.peer.connect(PREFIX + this.code, { reliable: true });
    this._wire(conn);
  }

  _retryDial() {
    this.joinRetries++;
    if (this.joinRetries > 15) {
      this.emit('failed', 'game not found — is it still on screen?');
      return;
    }
    setTimeout(() => {
      if (!this.connected && this.peer && !this.peer.destroyed) this._dial();
    }, 2000);
  }

  _wire(conn) {
    this.conn = conn;
    conn.on('open', () => {
      this.connected = true;
      this.joinRetries = 0;
      this.lastMsgAt = Date.now();
      this.emit('connected');
    });
    conn.on('data', (d) => {
      this.lastMsgAt = Date.now();
      this._handle(d);
    });
    conn.on('close', () => {
      if (this.conn !== conn) return;
      const was = this.connected;
      this.connected = false;
      this.conn = null;
      if (was) this.emit('disconnected');
      if (this.role === 'join') this._retryDial();
    });
    conn.on('error', () => {
      /* close handler covers cleanup */
    });
  }

  _handle(d) {
    if (!d || typeof d !== 'object') return;
    if (d.t === 'axis') this.emit('axis', typeof d.v === 'number' ? d.v : 0);
    else if (d.t === 'tap') this.emit('tap');
  }

  send(msg) {
    if (this.conn && this.conn.open) this.conn.send(msg);
  }
}
