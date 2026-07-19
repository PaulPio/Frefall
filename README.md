# FREEFALL

A Geometry Dash-styled endless falling game for the Sunjam game jam. The game
runs in a desktop browser — you **scan a QR code with your phone and tilt it
to steer** the falling cube around obstacles. You only fall faster.

- **Steer**: tilt your phone (or drag a finger on it) — or `←` `→` / `A` `D` on the keyboard
- **Death**: touch anything once and you explode
- **Score**: depth in meters + 25 per gem (gems live in the risky spots)
- **World**: hue-shifts through a new color zone every 500 m
- **Audio**: fully synthesized (WebAudio) — music intensity rises with fall speed; `M` to mute

## How the phone link works

No backend. The desktop registers a PeerJS peer (`sunjam-freefall-<code>`) on
the free PeerJS signaling cloud and shows a QR of the current URL +
`?room=<6-char code>`. The phone opens that URL, the same build detects
`?room=` and loads a lightweight DOM controller page (no Phaser), then streams
a tilt axis at ~30 Hz over a WebRTC data channel. While linked, the host
rejects extra peers (first controller wins until disconnect). Both sides run a
silence watchdog (controller stream = its heartbeat; desktop answers at 1 Hz),
so a dead phone pauses the game within ~4 s and reconnecting auto-resumes.

## Dev

```
npm install
npm run dev      # LAN-exposed (--host) — scan the QR with your phone on the same network
npm run build    # -> dist/
npm run preview  # serve dist/ for a final check
```

## itch.io upload

`freefall-itch.zip` (the zipped contents of `dist/`, `index.html` at the root)
is the upload artifact. Page settings:

- Kind of project: **HTML**
- ✔ "This file will be played in the browser"
- Viewport: **1280 × 720**, enable the **fullscreen button**
- Leave "Mobile friendly" **off** for the game page itself (the game is the
  desktop screen; phones join via the QR code, which opens the itch-hosted
  controller page directly)
- Suggested page instructions: "Best played with your phone as the controller —
  press play, scan the QR code, tap your phone, tilt to steer. Keyboard (←/→)
  works too."

Note: the QR encodes the page the game is served from (`html.itch.zone/...`),
so the phone link works on itch.io with zero configuration. DeviceOrientation
needs HTTPS — itch.io provides it.
