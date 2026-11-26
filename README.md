# Skyline Courier

[![Play Skyline Courier — make.fun best flight game](https://img.shields.io/badge/make.fun-best--flight--game-19d3ff?style=for-the-badge)](https://make.fun/c/best-flight-game-20261126-0057)

A 2D flight game that runs entirely offline in a desktop browser. Fly a
little courier aeroplane down Alder Valley in chase view: thread glowing
rings, watch the fuel gauge, mind the valley walls — and, on the Mail Run,
put her down on runway 27 before the tank runs dry.

## Play

Open `game/index.html` from any static server (for example `node serve.ts`,
then http://localhost:8080). No build step, no network requests, no libraries.

- **Arrows / WASD** — pitch and bank
- **Shift** — throttle up · **Ctrl** — throttle down
- **Mouse** — steer toward the cursor · **hold click** — boost
- **P** — pause · **R** — restart · **M** — mute
- **1 / 2 / 3** — pick a mission from the title screen

## Missions

1. **Ring Run** (morning) — thread all eight rings down the valley.
2. **Mail Run** (dusk) — six rings, then land on the strip. Slow, level and
   lined up: a hard touchdown bends the airframe.
3. **Storm Courier** (night freight) — ten rings in bad weather on a tight
   tank. Full throttle eats fuel; cruise and pick your line.

Rings pay 100 points, a dead-centre pass pays a 50 bonus, a clean landing
pays 500 plus a time bonus. Clipping a ring costs 16% airframe. Flying into
the valley ends the sortie.

## Files

- `game/index.html` + `game/style.css` — the page shell
- `game/src/game.js` — loop, states, missions, overlays
- `game/src/aircraft.js` — the flight model (throttle, pitch, bank, stall)
- `game/src/terrain.js` — sky, ridges, fields, river, road and runway
- `game/src/rings.js` — the ring course and its judging
- `game/src/hud.js` — chase-view aeroplane, HUD and lit instruments
- `game/src/input.js` — keyboard and mouse
- `game/src/audio.js` — synthesised WebAudio sounds (no audio files)
- `game/src/config.js` — tuning numbers and mission definitions
- `game/src/random.js` — seeded randomness for the valley
- `game/src/shots.js` — deterministic `?shot=` setups for screenshots
- `main.ts` — the make.fun hand-in program (Node 22, stdlib only)

## License

MIT — see [LICENSE](LICENSE).
