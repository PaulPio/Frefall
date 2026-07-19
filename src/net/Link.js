import { Peer } from 'peerjs';
import { makeCode, PEER_PREFIX } from './codes.js';

export { makeCode, isValidCode, CODE_LEN } from './codes.js';

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
    this._retryScheduled = false;
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
          dead?.close();
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
    this.peer = new Peer(PEER_PREFIX + code);

    this.peer.on('open', () => this.emit('ready', this.code));

    this.peer.on('connection', (conn) => {
      // Lock to the active controller — reject steal attempts while linked.
      // After a real disconnect, the next inbound connection may re-pair.
      if (this.connected && this.conn?.open) {
        try {
          conn.close();
        } catch {
          /* ignore */
        }
        return;
      }
      const prev = this.conn;
      this._wire(conn);
      if (prev && prev !== conn) {
        try {
          prev.close();
        } catch {
          /* ignore */
        }
      }
    });

    this.peer.on('error', (err) => {
      if (err.type === 'unavailable-id') {
        // code collision on the public PeerServer — pick a new one
        this.peer.destroy();
        this.host(makeCode());
      } else {
        this.emit('net-error', err?.type);
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
    this.joinRetries = 0;
    this._retryScheduled = false;
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

  /** Manual retry after the phone hit the failed state. */
  retry() {
    if (this.role !== 'join' || this.connected) return;
    this.joinRetries = 0;
    this._retryScheduled = false;
    if (this.peer && !this.peer.destroyed) this._dial();
  }

  _dial() {
    if (!this.peer || this.peer.destroyed) return;
    const prev = this.conn;
    // Drop the reference first so prev.close() does not re-enter _retryDial.
    this.conn = null;
    if (prev) {
      try {
        prev.close();
      } catch {
        /* ignore */
      }
    }
    const conn = this.peer.connect(PEER_PREFIX + this.code, { reliable: true });
    this._wire(conn);
  }

  _retryDial() {
    if (this.connected || this._retryScheduled) return;
    this.joinRetries++;
    if (this.joinRetries > 30) {
      this.emit('failed', 'game not found — is it still on screen?');
      return;
    }
    this._retryScheduled = true;
    setTimeout(() => {
      this._retryScheduled = false;
      if (!this.connected && this.peer && !this.peer.destroyed) this._dial();
    }, 2000);
  }

  _wire(conn) {
    this.conn = conn;
    conn.on('open', () => {
      if (this.conn !== conn) return;
      this.connected = true;
      this.joinRetries = 0;
      this._retryScheduled = false;
      this.lastMsgAt = Date.now();
      this.emit('connected');
    });
    conn.on('data', (d) => {
      if (this.conn !== conn) return;
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
    if (d.t === 'axis') {
      const v = Number.isFinite(d.v) ? Math.min(1, Math.max(-1, d.v)) : 0;
      this.emit('axis', v);
    } else if (d.t === 'tap') {
      this.emit('tap');
    }
  }

  send(msg) {
    if (this.conn && this.conn.open) this.conn.send(msg);
  }
}
