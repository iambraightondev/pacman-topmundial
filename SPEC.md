# SPEC — Pac-Man clásico (web, HTML5 Canvas)

Faithful recreation of the 1980 arcade game's MECHANICS in 100% original code.
Do NOT copy any original Namco assets (no ripped sprites, no ripped audio). All
graphics are drawn procedurally on canvas; all audio is synthesized with Web
Audio API. UI language: **Spanish**.

## Nivel de jugador, cronómetro y amigos

**Nivel** (`PM.Level`, `CFG.LEVEL_*`): the level measures **how much you
play**, not how good you are — every point of every game is XP, no record and
no minimum needed. The level is **derived** from the total (never stored), so
it cannot drift. `cost(n) = LEVEL_BASE * n^LEVEL_EXP` — each step costs more
and there is no cap. XP is granted **once per run, however the run ends**
(`Game.closeRun()`, guarded by `xpSent`): game over, surrender, restart from
the pause menu or walking out to the menu mid-game. Awarding it only at GAME
OVER meant everything played was thrown away if you left first. Shown on the
title screen with a progress bar and, on level-up, as an in-game notice — or,
if the level went up as you left, as a prompt on the menu
(`Game.pendingLevelUp` → `UI.showLevelUpPrompt`).

**Cronómetro**: `Game.timeTicks` advances during `PLAYING` and `DYING` (not
while paused or stalled), rendered as mm:ss in the bottom HUD row. Online it
travels in the snapshot (`tm`), so the host owns it.

**Amigos** (`PM.Friends`, `CFG.FRIENDS_KEY`): a local list of names —
add/remove, sanitised like nicknames, no duplicates, cannot add yourself.
Each row can invite them to the party and spectate their game (see Party).

**Pausa**: `Game.canPause()` allows the menu in any in-game state except
GAME OVER (and while a net notice is up), so `Escape`/`P` also work during a
death animation or a level change — before, being killed locked you out.

## Party (salas de grupo persistentes) — `PM.Party`

The party and the game share ONE channel (`sala:<code>`), so joining once is
enough: returning to the menu or finishing a game does **not** disband the
group (`Game.toMenu()` calls `Party.resume()` instead of `Net.leave()`).

- Membership messages are `p`-prefixed so they never clash with game ones:
  `phello` (each member beats every 2 s), `proster` (the leader owns and
  broadcasts the list), `pbye`, `pfull`, `pstart` (leader starts; carries the
  ordered roster and the host settings). Members not heard from in 7 s drop
  off the list. Beating pauses while a game is running — but NOT while merely
  spectating someone else's, which uses a different channel.
- `pstart` gives everyone their own index: `order[i].s === Net.sid` →
  `localIdx`. `Net.lockPeers(others)` then filters the channel, and
  `Party.indexOf(sid)` is what `Game.idxOfSender` uses with 3 and 4 players.
- Duplicate colours are re-assigned to `CFG.PLAYER_COLORS[i]` so no two
  Pac-Men look the same.
- **Invitations**: every player also listens on a personal channel
  (`usuario:<nick>`, opened by `Party.listen()` from `showMenu`). An invite is
  a one-shot channel to the friend's topic carrying the party code; the same
  topic answers `donde` with `aqui {code, jugando}` for spectating.
- With **more than two players**, a `bye` or a silent player no longer kills
  the game: `Game.dropPlayer(i)` benches them (`out`) and the rest keep
  playing. The host runs a per-player watchdog (`posWatch[]`) because the
  global one only needs *somebody* to talk.

**Espectador** (`net: 'spec'`, `localIdx = -1`): the host answers a
`hello {spec:1}` with `svista` (player count, names, colours, skins, settings)
plus a full snapshot with pellets. The spectator runs the guest loop with no
Pac-Man of its own: it sends nothing, cannot eat, chat, emote or surrender,
its pause is local, and the game never counts as its own (no history, no XP,
no ranking).

**Escaparate** (local games): a game with no `netRole` has no room, so a
friend could not watch it at all. `Game.openShowcase()` (called from
`newGame`, needs `Net.configured()` and a non-empty `rawName(0)`) opens
`sala:<randomCode>` as an **outbound-only** channel: it answers
`hello {spec:1}` with `sendShowView` (same `specView` payload as online) and
`stepShowcase()` pushes `snap` on the normal `SNAP_EVERY` cadence, while
`hostEvt` mirrors events into it. Nothing else is read from that channel and
the game never waits on it — on error it just closes (`closeShowcase`, also
called from `toMenu`). `Party.onUser('donde')` answers with the party code if
there is one, otherwise with `Game.showCode`, so the watcher's path is
identical for online and local games.

Watching runs on a **separate channel** (`Net.openView` → `viewCh`,
`viewHandler`, `viewOnClose`), never the main one, so the watcher's own party
stays connected the whole time and there is no need to leave the group. The
handlers must be passed **inside** `openView`'s `cbs` (`onMsg` / `onGone`):
`openView` starts by calling `closeView()`, which nulls `viewHandler`, so
assigning them just before the call silently wiped them and nothing ever
arrived.
`Game.netSend` funnels through `Net.gameSend`, which picks the view channel
when there is one; leaving a watched game only calls `Net.closeView()` and
then `Party.resume()`. If the watcher's own party starts a game, `Party.begin`
closes the view first and the watcher joins as a player.

## Logros, skins por nivel, perfil y cuentas

**Logros** (`PM.Achievements`, `CFG.ACHIEVEMENTS`, `CFG.ACH_KEY`): what is
stored are COUNTERS, never "unlocked yes/no" — `fantasmas`, `frutas`,
`partidas` (sum), `racha`, `nivelMax`, `limpios`, `puntosMax` (max) and
`mejorT1` (min, 0 = none yet). Each achievement declares `stat`, `goal` and
optionally `menor` (lower is better). This is what makes them recomputable at
any time — signing into an account merges counters and the achievement list
falls out of them, with no history of when anything happened. `claim()`
returns newly earned ones not yet announced; `Game.bumpAch()` records and
queues the in-game notice. Spectating records nothing, and online only your
own kills/fruits count.

**Skins by level** (unlock order `clasico` 1, `sombra` 3, `ojos` 7, `neon` 12,
`aro` 20, `pixel` 30 — `CFG.SKINS[].level`): gated on
`PM.Level.level()`. `Level.skinsAllowed(puesta)` always includes the skin
currently worn — a raised requirement must never strip what a player already
has. Locked ones render greyed with the level they need.

**Your own skin lives in PERFIL**, next to the avatar — it is as personal as
one. OPCIONES → JUGADORES keeps only your colour and the second local
player's look. Both rows register into the same `UI.skinRows`, so
`refreshSkins()` repaints them wherever they are, and `optionsMsg()` writes
the "locked skin" notice into both panels' status lines because the click can
come from either.

**Perfil** (`#profile`, tabs PERFIL / LOGROS): avatar, name, level bar,
summary, avatar picker, your skin and the account box. Avatars (`CFG.AVATARS`) are drawn
by `Sprites.drawAvatar` reusing the game's own sprites (faces, ghosts, fruit,
badge) scaled from a ~7 px native radius. Guests get a random-name button
(`CFG.RANDOM_NAMES`).

**Cuentas** (`PM.Account`, `CFG.ACCOUNT`): Supabase Auth over REST, no SDK.
The player only ever sees usuario + contraseña; the e-mail Supabase requires
is composed internally as `<usuario>@<MAIL_DOMAIN>` and never shown. The
usuario IS the in-game name, so ranking, party, invites and spectating keep
working off a single name. Tables `perfiles` and `amigos` live in
`supabase/cuentas.sql` with RLS (public read, owner-only writes). Signing in
runs `applyRemote` + `push`: cloud and local are MERGED keeping the best of
each (xp/records/counters never go down), so entering an account can never
cost progress. The profile carries **one record per format** —
`record1..record4`, driven by `Account.recordCols` against
`Game.recordFor/setRecordFor` — so the four mastery tracks follow the account
without storing a single badge list: each track is derived from its format's
record. Friends require an account; `PM.Friends` is only a local cache of the
cloud list.

`record3`/`record4` arrived after the table did, so **a project that has not
re-run `supabase/cuentas.sql` still works**: PostgREST answers 400 naming the
missing column, `Account.sinRecordsNuevos` is raised and the request is
retried without those two fields (`push`) or without those two columns in the
`select` (`pedirPerfiles`, shared by `fetchProfile`/`fetchProfiles`). Losing
the server migration costs the two new records, never the old ones. The flag
is memory-only, so the next session tries the full shape again.

The Supabase project MUST have Email provider on, sign-ups allowed and
**Confirm email off** — the internal mailbox does not exist, so a confirmation
link would lock every account out.

## App instalable (PWA) y pruebas

`manifest.json` + `sw.js` make the game installable and playable offline:
the shell (HTML, CSS, every `js/`, the streak audio and the icons) is
precached; **all code** (HTML, CSS, JS, JSON) is **network-first** so a new
deploy shows up at once and still works without a connection — with the copy
first you kept seeing the previous version for a whole visit. Media (audio,
icons) is cache-first, and cross-origin requests (Supabase: rooms and
ranking) always bypass the worker. Registered only over http(s) — with
`file://` there is no service worker and the game runs as before. Icons in
`icons/` are the game's own Pac-Man rendered to PNG.

Two ways to run the same battery: open `tests.html` from a server like the
game, or `node pruebas-node.js` (fake DOM, exits non-zero on failure, skips
only the pixel-counting checks — they guard themselves with
`window.__SIN_LIENZO`). After editing `js/`, serve `tests.html` on a NEW port
or the browser's heuristic cache will hand you the previous file and you will
be testing stale code.

`tests.html` runs `js/tests.js`: a dependency-free suite over the real
modules, covering what has broken before (per-player death, the `dy`
keep-alive that once froze the other player, streak voices, the solo/duo
badge split, ranking guards, history, chat sanitising, pause, party rosters,
big-group drop-outs, spectating). Open it from a server like the game;
results also land in `window.__TESTS`.

## Hard constraints

- Plain JS, **no ES modules** (must run from `file://`). Classic `<script>` tags
  loaded in order. Shared state lives under the `window.PM` namespace.
- No external network resources (fonts, CDNs, images). Fully offline for the
  local modes; ONLY the online mode talks to the network (Supabase Realtime),
  with a hand-written client (no external libraries).
- Files (all inside the project root):
  - `index.html`
  - `css/style.css`
  - `js/config.js`  — constants, maze, level tables (defines `PM.CFG`)
  - `js/audio.js`   — `window.AudioSys` (see Audio API)
  - `js/sprites.js` — procedural sprite drawing (defines `PM.Sprites`)
  - `js/pacman.js`  — player entity (defines `PM.Pacman`)
  - `js/ghost.js`   — ghost AI (defines `PM.Ghost`)
  - `js/net-config.js` — Supabase credentials placeholder (defines `PM.NET_CFG`)
  - `js/net.js`     — realtime transport for online mode (defines `PM.Net`)
  - `js/party.js`   — persistent group rooms and invites (defines `PM.Party`)
  - `js/achievements.js` — achievement counters (defines `PM.Achievements`)
  - `js/account.js` — Supabase Auth accounts + cloud profile (defines `PM.Account`)
  - `js/game.js`    — state machine + fixed-timestep loop (defines `PM.Game`)
  - `js/ui.js`      — menus, settings panel, party panel (defines `PM.UI`)
  - Script order in index.html: config, audio, sprites, pacman, ghost,
    net-config, net, party, badges, history, level, friends, ranking,
    achievements, account, game, ui.
- Rendering: native resolution 224×288 px (28×36 tiles of 8 px: 3 top rows for
  scores, 31 maze rows, 2 bottom rows for lives/fruits). Integer-scale up (×2.5
  or ×3) with `imageSmoothingEnabled=false` for crisp pixels. Game logic runs in
  native px (8 px per tile), fixed timestep 60 Hz with accumulator +
  requestAnimationFrame.

## Maze (28 cols × 31 rows, row 0 = top)

Symbols: `#` wall, `.` dot (10 pts), `o` energizer (50 pts), space = empty path
or out-of-bounds, `-` ghost house door. EXACT layout (each line 28 chars):

```
############################
#............##............#
#.####.#####.##.#####.####.#
#o####.#####.##.#####.####o#
#.####.#####.##.#####.####.#
#..........................#
#.####.##.########.##.####.#
#.####.##.########.##.####.#
#......##....##....##......#
######.##### ## #####.######
######.##### ## #####.######
######.##          ##.######
######.## ###--### ##.######
######.## #      # ##.######
      .   #      #   .      
######.## #      # ##.######
######.## ######## ##.######
######.##          ##.######
######.## ######## ##.######
######.## ######## ##.######
#............##............#
#.####.#####.##.#####.####.#
#.####.#####.##.#####.####.#
#o..##.......  .......##..o#
###.##.##.########.##.##.###
###.##.##.########.##.##.###
#......##....##....##......#
#.##########.##.##########.#
#.##########.##.##########.#
#..........................#
############################
```

- Total pellets MUST be 244 (240 dots + 4 energizers). Assert at load,
  `console.error` on mismatch.
- Tunnel: row 14; exiting left of col 0 wraps to col 27 and vice versa.
  Tunnel "slow zone" for ghosts: cols 0–5 and 22–27 on row 14.
- Ghost house: interior rows 13–15, cols 11–16; door at row 12, cols 13–14.
  Door is passable only for ghosts entering/leaving the house.
- Positions (tile coords, x may be x.5 = between tiles): Pac-Man start
  (13.5, 23); Blinky start (13.5, 11) outside; Pinky (13.5, 14), Inky
  (11.5, 14), Clyde (15.5, 14) inside house. Fruit spawns at (13.5, 17).
- Wall rendering: blue (#2121ff) 1px stroke per wall edge that faces a
  corridor, **inset `CFG.WALL_INSET` (2) px into the wall tile** so blocks
  read thin and corridors wide, as in the arcade (`Game.wallSide()` trims the
  stroke at convex corners and extends it at concave ones so the outline
  closes cleanly). Pink door, aligned with the neighbouring inset strokes;
  black background. Dots 2×2 px, energizers r=4 px blinking (~0.2 s on/off),
  color #ffb8ae.

## Movement & speeds

100% speed = 75.7575 px/s at 8px tiles (= 1.26262 px per 1/60 s tick).
Entities move along tile centers; turns only allowed when aligned within
half-speed of a tile center (snap to center on turn). Pre-turn buffering:
remember last direction key; apply when the turn becomes legal. Cornering:
allow the queued perpendicular turn up to 4 px before center (arcade-style
cornering advantage).

Percent-of-max tables (multiply by user difficulty multipliers, clamp ≤ 1.05·max):

| Level | Pac | Pac(dots) | PacFright | Ghost | GhostTunnel | GhostFright |
|-------|-----|-----------|-----------|-------|-------------|-------------|
| 1     | 80  | 71        | 90        | 75    | 40          | 50          |
| 2–4   | 90  | 79        | 95        | 85    | 45          | 55          |
| 5–20  | 100 | 87        | 100       | 95    | 50          | 60          |
| 21+   | 90  | 79        | —         | 95    | 50          | —           |

Eating a dot pauses Pac-Man 1 tick; an energizer pauses 3 ticks.

**Pac(dots) is documentation, not a second brake.** That column is the *same*
mechanic as the 1-tick dot pause, measured tile-to-tile: at level 1, 8 px at
80% take 7.92 ticks, +1 = 8.92, i.e. 8/8.92 = 71%. Levels 2–4 give 79% and
5–20 give 87%. Pac-Man therefore always runs at `pac` (or `pacFright`) and the
pause does the rest; applying both left him ~10% slower than the arcade
through dot corridors, which alone broke every memorised pattern.

## Ghost AI (the core of fidelity — implement exactly)

Ghosts think ONE TILE AHEAD: the moment a ghost enters a tile it decides which
way it will leave, and executes that turn at the tile center. The target is
therefore sampled half a step before the junction — that is what produces the
arcade's occasional "wrong" turns and what makes memorised patterns hold.
The decision is dropped (and retaken) whenever it stops being valid: forced
reversal, being eaten, leaving the house.

The decision itself: choose the legal direction (no reversing) minimizing
**straight-line (euclidean) distance from the candidate next tile to the target
tile**; ties break by priority UP > LEFT > DOWN > RIGHT. Reversal is forced
only when mode switches scatter↔chase or on entering frightened, and it takes
effect IMMEDIATELY, wherever the ghost happens to be — it does not wait for a
tile center (ghosts inside the house just flip their bob direction).

Targets (tile coords; off-map targets are fine):
- **Blinky**: Pac-Man's tile. Scatter (25, -3).
- **Pinky**: 4 tiles ahead of Pac-Man's facing; reproduce the arcade overflow
  bug: when Pac-Man faces UP the target is 4 up AND 4 left. Scatter (2, -3).
- **Inky**: take the tile 2 ahead of Pac-Man (same UP bug: 2 up and 2 left),
  then double the vector from Blinky to that tile: target = blinky + 2·(mid −
  blinky). Scatter (27, 32).
- **Clyde**: if euclidean distance to Pac-Man > 8 tiles → Pac-Man's tile,
  else his scatter corner (0, 32). Scatter (0, 32).

Frightened mode: at each decision point pick a pseudo-random legal direction
(try random first; if illegal, scan up,left,down,right). Blue body + white
face; flashes white/blue N times before ending.

That "random" MUST be reproducible, like the arcade's counter: the game owns a
seeded generator (`Game.rndDir` / `Game.rndUnit`, reseeded from the level in
`resetLevel` and from level+lives in `respawn`) and the fruit's 9–10 s lifetime
draws from it too. `Math.random` anywhere in the simulation means the same
level plays out differently every run and no pattern can ever be memorised.

**No-up zones**: in chase/scatter, ghosts may NOT choose UP at tiles (12,13),
(15,13), (12,25), (15,25). (Frightened/eyes ignore this.)

**Scatter/chase schedule** (seconds; after the last entry chase forever;
mode switches force direction reversal):
- L1: 7, 20, 7, 20, 5, 20, 5, ∞
- L2–4: 7, 20, 7, 20, 5, 1033, 1/60, ∞
- L5+: 5, 20, 5, 20, 5, 1037, 1/60, ∞
The schedule TIMER PAUSES while frightened is active.

**Frightened duration/flashes** by level (seconds/flashes; multiply duration by
user `frightMult`): L1 6/5, L2 5/5, L3 4/5, L4 3/5, L5 2/5, L6 5/5, L7 2/5,
L8 2/5, L9 1/3, L10 5/5, L11 2/5, L12 1/3, L13 1/3, L14 3/5, L15 1/3, L16 1/3,
L17 0, L18 1/3, L19+ 0. Duration 0 ⇒ ghosts only reverse, no blue mode.
Eaten-ghost chain: 200, 400, 800, 1600 (resets per energizer). On eating a
ghost: freeze gameplay 1 s showing the score where the ghost was (Pac hidden),
eyes then return to house, re-emerge in current mode.

**Ghost house exit** (dot counters, arcade rules):
- Pinky personal limit 0; Inky 30 on L1 else 0; Clyde 60 on L1, 50 on L2,
  else 0. Personal counters only count while that ghost is the "preferred"
  (Pinky→Inky→Clyde) one inside.
- After a life is lost, a GLOBAL counter is used instead: Pinky leaves at 7,
  Inky at 17, Clyde at 32 (when Clyde's 32 is reached, revert to personal
  counters).
- Failsafe timer: if Pac-Man eats no dot for 4 s (L1–4) / 3 s (L5+), the
  preferred ghost inside leaves.
- Inside the house ghosts bob up/down; leaving = move to center then up
  through the door to (13.5, 11).

**Cruise Elroy** (Blinky speed-up; disabled while Clyde is in the house after
a death, until Clyde leaves): thresholds by dots REMAINING —
L1 20/10, L2 30/15, L3–5 40/20, L6–8 50/25, L9–11 60/30, L12–14 80/40,
L15–18 100/50, L19+ 120/60. Elroy1 speed = ghost% + 5, Elroy2 = ghost% + 10.
Elroy ignores scatter (keeps chasing).

## Collisions, scoring, flow

- Collision = same tile as a ghost, checked once per tick and nothing else
  (chase/scatter ⇒ lose life; frightened ⇒ eat ghost; eyes ⇒ nothing).
  Crossing head-on through a ghost in a single tick is therefore possible,
  as in the arcade.
- Scoring: dot 10, energizer 50, ghosts 200/400/800/1600, fruit per table.
  Extra life at 10 000 (once). High score persisted (localStorage).
- Fruit: spawns at 70 and 170 dots eaten, lasts random 9–10 s, at (13.5,17).
  Table: L1 cherry 100, L2 strawberry 300, L3–4 peach 500, L5–6 apple 700,
  L7–8 grapes 1000, L9–10 galaxian 2000, L11–12 bell 3000, L13+ key 5000.
  Eaten fruit shows its score ~2 s. Bottom-right shows the last ≤7 level fruits.
- Level complete: all 244 pellets → freeze 1 s, ghosts hidden, maze walls
  flash white/blue 4×, ~2 s pause, next level.
- Death: ghosts freeze 1 s, then Pac death animation (~1.5 s, opening past
  180° and vanishing) + death sound; decrement lives; respawn READY (2 s) or
  GAME OVER text. **In 2-player modes the game only stops when the last one
  standing dies** — see "Muerte por jugador" below.
- States: MENU → READY ("¡LISTO!" text, intro melody first time: ~4.2 s) →
  PLAYING → (DYING | LEVEL_DONE | GAME_OVER) → …  P or Escape = pause, which
  opens the pause menu (REANUDAR / REINICIAR `R` / SALIR `Q`). Game over shows
  its own panel (play again / menu) instead of dropping to MENU by itself.
- HUD: top "1UP" + score, "HIGH SCORE" + value (score font: bold monospace,
  white). Bottom-left: remaining lives as mini Pac-Mans (in the chosen color).
- Controls: Arrows + WASD. Touch: swipe on canvas (multi-touch; in local
  2-player mode the left half of the canvas steers J1 and the right half J2;
  in 1-player/online any swipe steers the local player). Touch devices also
  get on-screen controls during a game: a pause button (top-right) and
  directional pads — one centered pad in 1-player/online, two corner pads
  (left = J1, right = J2) in local 2-player.
- Collisions: same tile as a ghost, AND tile-swap in the same tick (head-on
  crossing). The original arcade let entities pass through each other when
  swapping tiles between frames; that is deliberately fixed here.

## Difficulty & settings (contract used by ui.js + game.js)

```js
PM.settings = {
  difficultyPreset: 'normal',  // 'facil' | 'normal' | 'dificil' | 'custom'
  nick1: '',             // player 1 name (also the player's own name online)
  nick2: '',             // player 2 name (local 2-player)
  skin1: 'clasico',      // player 1 skin (also the player's own skin online)
  skin2: 'clasico',      // player 2 skin
  pacColor: '#ffff00',
  pac2Color: '#00ff00',  // player 2 color (2-player modes)
  livesMode: 'shared',   // 'shared' (team pool, default) | 'individual'
  ghostSpeedMult: 1.0,   // 0.5–1.2, step .05
  pacSpeedMult: 1.0,     // 0.8–1.3, step .05
  frightMult: 1.0,       // 0–2, step .25  (× frightened duration)
  startLives: 3,         // 1–5
  startLevel: 1,         // 1–21
  muted: false,
  volMaster: 1, volMusic: 1, volSfx: 1, volLoops: 0.8, volVoices: 1  // 0–1, step .1
}
```

Presets — facil: ghost .85, pac 1.05, fright 1.5, lives 5, level 1;
normal: 1/1/1/3/1 (arcade exact); dificil: ghost 1.1, pac 1.0, fright .5,
lives 2, level 5. Editing any slider switches preset to 'custom'. Persist to
localStorage `pacman-topmundial-settings`; high score
`pacman-topmundial-highscore`. Changes to speed/lives/level apply on next new
game; color + mute apply live.

`ajustes` maps onto `PM.settings`: `velFantasmas` → `ghostSpeedMult`,
`velPac` → `pacSpeedMult`, `powerS` → `frightMult` (the frightened-duration
multiplier), `vidas` → `startLives`. Optional fifth key `vidasModo:
'individual'` travels only when a 2-player game did not use the default
shared lives pool — it changes the simulation, so a replay would diverge
without it. `modo: 'reto'` is accepted by the format but never produced yet.

`PM.Replay.serializar(rep)` returns a compact URL-safe string (`~`-separated
fields, base36 numbers, tick deltas, one packed letter `G..V` per
player+direction pair and `*n` run-length for identical repeats) and
`PM.Replay.leer(texto)` parses it back. `leer(serializar(x))` must deep-equal
`x` — there is a test for that. `leer` never throws and returns `null` for
anything malformed: the text can arrive from a URL that went through a chat
app.

### The replay clock

`Replay.t` is **not** `Game.tick`. It only advances while the game really
simulates (`PLAYING`, `DYING`, `LEVEL_DONE`) and never during `READY`,
because the length of the READY banner comes from the intro tune and can
differ between runs. Nothing moves during READY, so freezing the clock there
costs nothing and makes the ticks line up every time. It also stops while
paused.

Ordering matters: on each `Game.step()`, `Replay.paso()` first injects every
entry with `tick <= t` and only then advances `t`. That places an injected
turn in exactly the same slot a live key press occupied — a key pressed
after step *k* lands before the simulation of step *k+1*.

### Hooks in game.js (four calls and nothing else)

| Where | Call | Why |
|---|---|---|
| `newGame()` | `Replay.alEmpezar(opts)` | starts a recording, or restarts the replay being watched |
| `setPacDir()` | `Replay.entrada(idx, d)` | records the turn; returns `false` to swallow the input while a replay is playing |
| `step()` | `Replay.paso()` | injects turns and advances the replay clock |
| `closeRun()` | `Replay.alAcabar()` | closes and stores the replay, however the game ended |

Plus `Game.replaying` (guards `bumpAch` and `persistHighScore`) and
`Game.timeScale` (the fixed-step loop multiplies its accumulator by it, so x2
means more 1/60 s steps per frame — the simulation is untouched).

Asking for the direction a Pac-Man already wants is a no-op
(`setDesiredDir` only records the wish), so it is **not** stored. That is
what keeps a held-down key — which fires `keydown` every few hundredths of a
second — from filling the replay with identical entries.

### Watching a replay

A replay never counts (both formats): `xpSent`, `rankingSent` and `timeSent` are forced true
at start, `bumpAch` and `persistHighScore` bail out, no history row, no
world-ranking submission, no showcase channel. The on-screen controls (dpads,
emotes, surrender) are hidden and the keyboard cannot steer.

`Replay.pausaPrompt()` and `Replay.finPrompt()` replace the pause and GAME
OVER dialogs (`ui.js` delegates to them when `Game.replaying`), and a fixed
top bar shows the REPETICIÓN banner plus pause / x2 / restart / exit.
`REINICIAR` goes through `Game.restartGame()`, which lands back in
`newGame()` → `alEmpezar()` and simply rewinds the replay.

### Storage

`CFG.REPLAY_KEY` (`pacman-topmundial-repeticiones`) holds a list of
`{ id, t, j, p, lv, b, s }`, newest first: `s` is the serialised text and
`b = 1` marks the personal-best replay for that player count, which is never
pruned while there is anything else to drop. `CFG.REPLAY_MAX` (8),
`CFG.REPLAY_MAX_CHARS` (24000, one replay) and `CFG.REPLAY_TOTAL_CHARS`
(90000, all of them) bound the size, and a failed `setItem` drops the oldest
and retries. `Replay.paraPartida(fila)` matches a `PM.History` row to its
replay by score, player count and timestamp (both are written in the same
`closeRun`, milliseconds apart) — that is what puts the `VER` button in
TOP MUNDIAL → TUS PARTIDAS.

### Online games: the network format (v2)

Input replays cannot work online. There the host simulates and the guests send
**positions** (`gevt`/`pos`), not keys, so replaying anybody's keys rebuilds
nothing. What online *does* have is a stream that already tells the whole
story: the snapshots and events the host broadcasts. Those are recorded as-is
(`Replay.redCuadro` from `netMaintain`, `Replay.redEvento` from `hostEvt`,
**host only** — a guest sees only what reaches it), and watching one puts the
game in **spectator** mode fed from a file instead of a room, so playback
reuses the watch-a-friend path that already existed. Between snapshots the
spectator dead-reckons exactly as in a live game, so 6 Hz still looks smooth.

Size is the whole design constraint: raw JSON is ~470 KB per minute. Each
snapshot is flattened into a **fixed-order numeric vector** (no keys,
`aplanaSnap`/`montaSnap` — the order *is* the contract; new fields go at the
end and bump `CFG.REPLAY_NET_V`) and stored as its **delta against the
previous one** in base 36 with zero-runs collapsed, since almost nothing
changes between consecutive snapshots. That plus recording 1 in
`CFG.REPLAY_NET_EVERY` (6 Hz) leaves it at ~26 KB per minute.

The zero-run marker is `*`, **not a letter**: in base 36 a number can start
with one (`z` is 35, `z0` is 1260), so a letter marker makes a value of 35
read as "one zero" and the whole replay drifts. `Replay._codec` exposes the
pieces so the tests can hit them directly — it is the riskiest part, and a
wrong field shows up as a crooked replay, not as an error.

Pellets: the skipped snapshots' eaten cells are **accumulated** into the next
recorded frame (otherwise dots would linger), and the full map (`pm`) is kept
once per level. These live in their own store (`CFG.REPLAY_NET_KEY`, 2 games,
`REPLAY_NET_MAX_CHARS`/`REPLAY_NET_TOTAL_CHARS`) so they neither compete with
the local ones nor get pruned by their rules, and they are **not shareable by
link** — too big for a URL. `Replay.paraPartidaRed()` puts the `VER` button on
their history row; the register carries `myPoints()`, like the history row, so
a PAC-MAN VS. hunter still matches.

### Sharing and the world ranking

`Replay.enlace(rep|texto)` builds `<base>?rep=<texto>`; `UI.init()` calls
`Replay.desdeUrl()`, which opens the game straight into the replay and shows
a dialog (game unaffected) if the text is corrupt. Only v1 (local) replays fit
a link.

For the world ranking, which will carry a replay per row, the public entry
points are already there and need no change to this module:

## Nombres de jugador (nicknames)

Entered on the **title screen** (agar.io style): a "TU NOMBRE" field right
above the play buttons, bound to `nick1`. The options panel repeats it in
section "NOMBRES" ("TU NOMBRE (J1 Y ONLINE)" → `nick1`, "JUGADOR 2 (LOCAL)"
→ `nick2`). One setting may have several fields; `UI.nickInputs[key]` is an
array and `UI.refreshNicks(skip)` keeps them in sync (never overwriting the
field being typed in). Enter blurs the field. Sanitised to uppercase
`A-Z0-9 ._-`, collapsed/trimmed spaces, max `CFG.NICK_MAX` (12) chars; the
filter runs on every keystroke, the trim on blur. Empty falls back to
"J1"/"J2" (`Game.nameFor(i)`; `Game.rawName(i)` returns '' when unset).

Shown in: the HUD (1-player replaces "1UP"; 2-player keeps "EQUIPO" over the
team score and adds a third header line, name 1 left / name 2 right in each
player's colour, 7 px), above each Pac-Man during READY (replacing J1/J2),
the online lobby status, the surrender/rematch dialogs and the GAME OVER
panel. Online, the two names are exchanged in the handshake (`n` field) and
kept in `Game.netNames = [J1, J2]`; the guest always sends its own `nick1`.

Everything drawn on the 224 px canvas goes through `Game.fitText(ctx, text,
x, y, width, size)`, which shrinks the font (down to 4 px) until the name
fits its slot instead of clipping it: the "1UP" slot, each team header slot
(halves with 2 players, `(224-16)/n` with 3-4) and the READY labels. The
in-game chat lines shrink the same way when `name: text` overflows. The
server-side limit lives in the `CHECK` constraints of `supabase/ranking.sql`
(`nombre1`/`nombre2`) and `supabase/cuentas.sql` (`perfiles.usuario`,
`amigos.amigo`) — raising `CFG.NICK_MAX` means re-running both.

## Muerte por jugador (2 players: the game does not stop)

A death freezes **only that Pac-Man**, never the whole game, as long as
someone else is still playing. Per-Pac state (`js/pacman.js`): `dying`,
`deathPhase` (0 freeze / 1 animation), `deathTicks`, `deathOk` (guest: host
confirmed), `safeTicks` (respawn grace).

- `Game.startDeath(i)` marks that Pac-Man dying and only enters the global
  `DYING` state when `anyPlaying(i)` is false (the last one). 1-player is
  therefore unchanged: classic freeze → animation → READY reset.
- `stepPacDeaths(finish)` runs the freeze (`DEATH_FREEZE_TICKS`) and the
  animation (`DEATH_ANIM_TICKS`) per player; with `finish` it then calls
  `finishPacDeath(i)`: one life off the pool (shared) or off that player
  (individual), and either respawn at their own spawn with
  `CFG.RESPAWN_SAFE_TICKS` (2 s) of invulnerability — blinking, ghosts pass
  through — or `out = true` (spectator) if there are none left.
- While `dying` a player is skipped for movement, eating, fruit and
  collisions, and ghosts do not target them (`pacContextFor`). Ghosts,
  schedule, fruit, sound and the other player keep running normally; ghosts
  are only hidden during the *last* player's animation.
- GAME OVER when everybody is `out`. Shared lives thus mean: the pool runs
  out, whoever dies next becomes a spectator, and the survivor plays on.
- Online: the guest still predicts its own death (freeze + `gevt died`) and
  the host confirms with `evt death {w, g}` (`g` = it was the last one). The
  guest never applies the host's `pd` for its *own* Pac-Man (the host always
  sees that death start and end later, so copying it would restart the
  animation in a loop); if the confirmation does not arrive within
  `CFG.DEATH_CONFIRM_TICKS` the prediction is rolled back. While dying the
  guest **keeps sending `pos` at the usual rate but flagged `dy:1`**: the host
  ignores the position of a `dy` message (its frozen spot would drag the pac
  back after respawning) yet still counts it as a sign of life. Going silent
  instead starves the host's watchdog, which after `WAIT_TICKS` freezes the
  whole simulation — i.e. one player's death animation stops the other's game.

## Skins, emotes, maestrías, ranking y chat

**Skins** (`CFG.SKINS`, settings `skin1`/`skin2`): unlocked by player level
(see above), drawn procedurally over the chosen colour in
`Sprites.drawPacman(ctx, x, y, dir, mouth, color, skin)` — `clasico` (plain
arc), `ojos` (eye looking forward), `neon` (glow), `aro` (ring outline),
`pixel` (blocky body) and `sombra` (trail behind). Applied to the player, its
lives icons and the option thumbnails (each thumbnail is a real mini-canvas
render). Exchanged online in the handshake (`k` field → `Game.netSkins`).

**Emotes** (`CFG.EMOTES`): six **drawn Pac-Man faces**, not words —
`risa`, `llanto`, `enfado`, `susto`, `guino`, `amor`. `Sprites.drawPacFace`
renders them procedurally: body in the player's own colour plus black
features on top (arc/dot eyes, eyebrows, mouth shapes, cyan tears, heart
eyes), so they read at 8 px tiles and identify who sent them. The array
order **is** the key order: `1..6` fire the emote at that index (and the
EMOTES bar shows each face with its number in the corner, drawn on a mini
canvas in the local player's colour). `Game.sendEmote(i)` shows the bubble
(`Sprites.drawEmote`) over that Pac-Man for `EMOTE_TICKS`, with an
`EMOTE_COOLDOWN` antispam gap.

Both take an optional `tick` (free-running frame counter) and **animate**:
the laugh bounces and its mouth opens, the crier drips two staggered tear
streams, the angry one trembles, flushes red and vents steam, the scared one
shivers with darting pupils and a cold sweat drop, the wink opens the eye
now and then with a sparkle, and the love hearts beat while little ones
escape upwards. `drawEmote` also bobs the balloon by whole pixels (so the
1 px border stays crisp) and clips its inside, so nothing animated leaks
into the maze. Passing no `tick` draws the still pose — that is what the
PERFIL avatars and thumbnails use. The EMOTES bar animates its faces with a
`requestAnimationFrame` loop that only runs while the bar is open
(`UI.refreshEmoteFaces` starts it, `UI.drawEmoteFaces(tick)` paints a frame).

Available in every mode. Online: guest
`gevt {t:'emote', e}` → host re-broadcasts `evt {t:'emote', w, e}`; each side
ignores the echo of its own.

**Enseñar la maestría**: `Ctrl+Espacio` (or the MI MAESTRÍA button in the
emote bar, for touch) puts your highest badge **of the current mode's track**
over your own Pac-Man —
`Sprites.drawBadgeTag`, same bubble as the emotes with the medal and the
badge colour, sharing the emote slot (`{tag, color, ticks}` instead of `{e}`)
and cooldown. Badges are per-device, so the wire carries the **id** and the
receiver looks it up in `CFG.BADGES`: guest `gevt {t:'badge', b}` → host
`evt {t:'badge', w, b}`, same echo guard. An empty id means "SIN MAESTRÍA",
which is what a player with no badge yet shows. Works in every mode.

**Maestrías** (`PM.Badges`, `CFG.BADGES`): six tiers (APRENDIZ 3 000 → TOP
MUNDIAL 100 000) on **four independent tracks, one per format**, so a big
squad run never hands out the duo or the solo badges:

| track | players | record |
|---|---|---|
| `'solo'` | 1 | `Game.highScore1` |
| `'duo'` | 2 | `Game.highScore2` |
| `'trio'` | 3 | `Game.highScore3` |
| `'escuadra'` | 4 | `Game.highScore4` |

**Each record is its own league** — `Game.recordFor(n)` / `setRecordFor(n, v)` /
`recordKey(n)` resolve them, `persistHighScore` writes only the one for
`playerCount` (a squad run no longer overwrites the duo record) and `newGame`
shows that format's record as the in-game HIGH SCORE. The four travel to the
account as `perfiles.record1..record4`, so the tracks follow the player from
one device to the next (see **Cuentas**).

**The bar rises with the players**: `Badges.goal(badge, mode)` =
`badge.points × players`, so APRENDIZ is 3 000 solo, 6 000 duo, 9 000 trio and
12 000 squad. A team scoreboard belongs to everybody — with four players you
reach the same number with four times the lives, four mouths eating and four
ghosts per energiser — so the same figure is worth much less per person.

Every API takes the mode (`best/earned/top/next/has/claim/goal/players/
modeName`), and `Game.badgeMode()` derives it from `playerCount` via
`Badges.modeFor`. Earned badges are derived from the record, so nothing can
desync; localStorage (`CFG.BADGES_KEY`) only stores which ones were already
announced, now as `{solo:[], duo:[], trio:[], escuadra:[]}` — an old flat array
is migrated into **solo and duo only** (the two tracks that existed), so
nothing gets re-announced and the new tracks start clean.
`Game.checkBadges()` runs on **every score change**
and announces **only what you did not already hold** (`Badges.claim` returns
the highest un-announced tier, or nothing): re-celebrating tiers you already
had meant a banner every single game, and in a party that is five seconds of
somebody else's maze covered for a medal that isn't theirs.

Where it is drawn depends on how many are playing (`Game.bigNotices()`,
`playerCount <= 1`): alone, the full banner across the maze
(`Sprites.drawBadgeBanner`); with anyone else, a narrow strip at the very top,
outside the maze (`Sprites.drawBadgeStrip`, entering from the **left** so it
never reads as the achievement band, which enters from the right). Both share
that top slot, so `stepBadgeNotice` **holds** the badge (its ticks do not run)
while an `achNotice` is on screen and `renderStateText` skips it. The guest
also gets it when the snapshot brings the score.

The MAESTRÍAS panel has four tabs — EN SOLO / EN DÚO / EN TRÍO / EN ESCUADRA —
each listing the six tiers **with that track's own figures**: its record, its
scaled goal per tier and what is missing for the next one. Layout is
**list + stage**: the six tiers on the left (one column, `.badge-split`
overrides the two-column rule the other `.badge-list`s get at 1000 px), the
picked one **large** on the right (`.badge-stage`); narrow screens stack them
with the stage on top (`order: -1`). There is no `VER` button any more — the
row **is** a `<button>` (`.badge-pick`), so pressing it picks the tier and
arrow-key navigation reaches it for free. `UI.pickBadge(id, play)` marks the
row (`.sel`), writes the stage caption (TU MAESTRÍA / CONSEGUIDA / what is
missing) and either plays the tag (`UI.playBadgeDemo`, which advances by a
**capped** per-frame delta so a throttled browser slows it down instead of
skipping it) or leaves it at rest (`UI.drawBadgeRest`: your Pac-Man with the
medal floating above, dimmed when the tier isn't yours). The demo canvas is
130 × 50 logical px at **triple** scale, shifted up by `UI.badgeTop` so the
empty band above the tag isn't drawn. Opening the panel defaults to the tier
you hold (`Badges.top(mode)`, or the first one if you hold none) and plays it;
switching tabs re-defaults without playing. `Ctrl+Espacio` shows the badge of
the **mode being played**.

**Showing off the badge in-game** (`Sprites.drawBadgeTag`, `t` from the
emote's remaining ticks): it has its own animation, deliberately **not** the
panel banner's — the medal rises **centred over the player**, the plaque then
**unrolls to its right** out of the medal (which slides into its slot), and it
shrinks back toward the player to leave. Face emotes keep their instant
balloon.

**How much pomp depends on the tier** (`rango`, the 8th argument: 0 APRENDIZ …
5 TOP MUNDIAL, defaulting to 2 so old callers are unchanged). One animation
for all six meant reaching TOP MUNDIAL looked exactly like APRENDIZ. The
`POMPA` table in `sprites.js` holds one row per tier and **each step only adds
to the one below** — never replaces it:

| tier | shape (`chapaPath`) | adds |
|---|---|---|
| APRENDIZ | rectangle | nothing: the medal rises straight, the plaque unrolls |
| CAZADOR | rectangle | one medal flip (edge-on frames draw the plain back) + spark burst |
| EXPERTO | bevelled corners | double flip + the glint that sweeps the medal (what all six used to get) |
| MAESTRO | hexagon (a point per end) | shockwave ring + second breathing frame + sparks falling off the plaque |
| LEYENDA | **shield** behind the medal + pennant (swallowtail right) | rotating ray fan behind + stars orbiting the medal + name typed letter by letter + medal halo |
| TOP MUNDIAL | bigger shield, double edge and crowned, with the serrated pennant coming out of it | white flash on landing + more of everything + a shine sweeping the name |

The silhouette is one path built at the same box, so text and medal never move
— but the ends that bite inwards need room: `padR` goes 6 → 10 for the
pennant's swallowtail, and TOP MUNDIAL's shield pushes `padL` 15 → 20 so the
first letter doesn't climb onto it. The second frame (`marco`) and the stroke
reuse the same path, and the tips shrink with the plaque (`min(5, w * 0.25)`)
so the shape holds while it unrolls instead of folding over itself.

The **shield** (`escudo`: 1 on LEYENDA, 2 on TOP MUNDIAL) is not part of that
path: it is drawn after the plaque and before the medal, scaled by the same
`abre` so it unfolds with the ribbon, and it sticks out above and below the
band — that is what takes the top two out of the "one more band" family. Tier
5's is bigger, carries a second inner edge and wears the crown (which moves up
from the medal to the top of the shield); tier 4's is smaller and plain. Its
tip points at the player, so both skip the little tab the others draw, and
`padL` grows to 18/20 accordingly.

`Game.badgeRank(id)` turns the badge id into the tier and stores it in the
emote (`rango`), so it also travels right over the network — the id is what is
sent and each end resolves the tier locally. In the panel, `UI.playBadgeDemo`
passes the picked tier, which is why the demo canvas leaves room above the
plaque (`badgeTop`): the rays and the flash spill out of it.

**Top mundial** (`PM.Ranking`): games are posted through the `enviar-record`
Edge Function; reads go to Supabase via PostgREST with the anon key — no SDK.
There is **one board per format**, told apart by the `jugadores` column: `1`
individual, `2` duo, `3` trio, `4` squad, with `nombre1..nombre4` and the
unused ones NULL (`ranking_nombres_chk` enforces exactly as many names as
players). Trio and squad games used to be dropped on the way out
(`playerCount > 2` returned early) and the table only allowed 1 and 2, so they
never left the player's browser; now every format has its own board, matching
its own record and its own mastery track. Reads go to the **`ranking_top`
view**, which keeps only each player's/team's best run (`distinct on
(jugadores, equipo)`, where `equipo` concatenates the names present) —
otherwise whoever plays most fills the whole table with repeats.

The panel's tab ids are **the player count for `1..4`**, plus `5` NIVEL 1, `6`
RETO DE HOY and `0` TUS PARTIDAS (local first, cloud too when there is an
account). The season row shows on `1..4` only. Switching fast is guarded by a request token, so a late reply
from the previous tab cannot overwrite the current list.

`Ranking.jugadores(n)` clamps a format, `Ranking.COLS` is the shared column
list and `Ranking.nombresDe(fila)` returns the names present, so one render
path draws a solo run and a four-name squad alike.

In the Edge Function the **points ceiling is unchanged** by player count — a
level holds the same pellets, ghosts and fruit however many mouths are eating
— but the **time floors are divided by the players** (`MIN_MS_POR_NIVEL /
jugadores`, `MAX_PUNTOS_POR_S * jugadores`): four Pac-Men clear a level in a
quarter of the time, and without that a legitimate squad would be rejected as
`TIEMPO IMPOSIBLE`.

**Anti-spam y nombres**: a `before insert` trigger caps 5 rows per name per
minute (it is not anti-cheat — that would need an Edge Function — but it
stops flooding). `Ranking.nameAllowed()` rejects `CFG.BAD_WORDS` on a
normalised name (uppercase, leet digits folded back to letters, symbols
stripped), so a public board cannot be filled with insults; the GAME OVER
panel explains it. Local play is unaffected: the filter only gates the board.

**Historial** (`PM.History`, `CFG.HISTORY_KEY`): the last `HISTORY_MAX` games
of this browser, saved on every game over **regardless of name or network**,
shown in the TUS PARTIDAS tab (works offline).

**Con cuenta the panel also reads the cloud.** The data was already in
`ranking`; `History.remote()` fetches it with
`or=(nombre1.eq.X,…,nombre4.eq.X)` — your games as a party *guest* are in
`nombre2..4`, since the host submits the team — and `History.list()` merges
it with the local rows. Only with an account: a bare nickname identifies
nobody, so fetching by name alone would show you someone else's games.

Merging has no shared id (the local row is written at game over, the
`ranking` row is stamped by the server a moment later), so `History.misma()`
pairs them by format and time (2-minute window), plus points **when there is
one player** — in a team game the local row holds `Game.myPoints()` and the
board row holds the team's. Ties go to the local row: it has your points and
the replay (`Replay.paraPartida` cross-matches by points, players and time).
`History.add` therefore stores the real player count (1..4); it used to clamp
to 1 or 2, which left a squad's own game looking like a solo run and unable
to find its replay.

**A record needs a name**: `Game.missingRankingName()` checks `rawName()`
(the real nickname, not the J1/J2 fallback) for every player involved, and
without it nothing is submitted — the GAME OVER panel says why instead of
failing silently. `Ranking.submit()` rejects nameless rows again on its side.
Only the host submits online, once per game (`Game.rankingSent`). The table lives in `supabase/ranking.sql`
(public select + insert, no update/delete — note it needs the table-level
`GRANT ... TO anon` on top of the RLS policies, or PostgREST answers 401);
if it is missing the panel says so instead of failing. Scores are client-submitted and therefore forgeable —
hardening means validating in an Edge Function.

**Chat** (online only): `T` or the CHAT button opens an input; Enter sends,
Esc closes. Messages are sanitised (`Game.cleanChat`: no control chars,
collapsed spaces, `CFG.CHAT_MAX` chars) and rate-limited by
`CHAT_COOLDOWN`. The last `CHAT_KEEP` messages are drawn over the lower maze
for `CHAT_TICKS`. Wire: guest `gevt {t:'chat', m}` → host `evt {t:'chat', w, m}`.
While the chat input has focus the game keyboard is inert.

## PAC-MAN VS. (human-controlled ghost)

`js/versus.js` (`window.PM.Versus`) turns one of the four ghosts over to a
player. The design rule is that the human ghost is *a ghost*: only the choice
of turn changes hands. Everything else stays in `ghost.js` untouched — walls,
the house door, no-up tiles, per-level speed tables, tunnel slowdown,
frightened mode, being eaten and returning home as eyes.

### Assignment

Each party member advertises a ghost id (`g`, 0..3, or -1 for Pac-Man) in
`phello`; the leader arbitrates in `Party.claim()` and republishes the result in
`proster`, so two players can never end up on the same ghost. `Party.anyPac()`
gates `canStart()`: a round with no Pac-Man is not a round.

`Party.gameOrder()` carries `g` per seat. `Game.newGame({ ghosts: [...] })`
passes it to `Versus.setup()`, which:

* normalises the list (`Versus.clean`): no duplicates, at least one Pac-Man;
* sets `ghost.human = true` on the claimed ghosts;
* marks the driver's `Pacman` as `out = true` with `lives = 0`.

Reusing `out` is what keeps the change small: an `out` pac is not drawn, not
targeted by `pacContextFor`, not collided against, does not consume lives and
does not count for `anyPlaying()` / GAME OVER. `Game.actorFor(i)` returns the
ghost instead of the pac for name tags and emotes, and `Game.colorFor(i)`
returns the ghost's colour.

### Movement rules

`Ghost.decide()` builds the legal-exit list exactly as before (walls, door,
no-up tiles, no reversal) and only then, for `Ghost.driven()` (`human &&
taken && mode === 'normal'`), hands over to `Ghost.humanChoice(candidates)`:

1. the requested direction, if legal from here;
2. otherwise straight on — what a player who is not pressing anything expects;
3. otherwise the first legal exit in the usual UP > LEFT > DOWN > RIGHT order,
   because a ghost never stops.

**When the exit is chosen.** The AI thinks one tile ahead (decision on tile
ENTRY, executed at the centre) and that arcade rule stays. For a driven ghost
it does not: entry-time planning eats the half tile before the junction, so a
key pressed *as you arrive* was never looked at, the ghost sailed past the
turn — and, because the intent is standing, it then turned two junctions later
on its own. `updatePath` therefore re-plans when `driven() && planWish !==
wishDir`, which gives the player the whole tile up to the centre, exactly the
window Pac-Man gets. The AI is untouched: its `wishDir` never changes. The
host re-plans through the same path when a `gdir` lands, so a late intent is
still applied at the junction the driver aimed at instead of the next one.

Consequences, all deliberate:

* **No 180° turns.** The requested direction is picked from a list that already
  excludes `OPP[dir]`, so the human is bound by the same rule as the AI. This is
  the rule that keeps Pac-Man escapable in a corridor, and it is what makes
  knowing the maze worth something. The one exception is the one the AI also
  has: a dead end, where `decide()` returns `backDir`.
* **No scatter/chase reversal.** `Game.forceReversal()` skips human ghosts:
  there is no mode to switch for them, and flipping them would take the
  controls out of the player's hands. The **energizer reversal still applies**
  (`forceReversalFright()` is untouched) — that is part of frightened mode,
  which the brief asks to keep as is, and it is the counterweight that makes
  eating an energizer worth something.
* **Frightened mode is still driven by the player.** The pseudo-random flee AI
  is AI; the player keeps the controls and runs away himself, at the slower
  `ghostFright` speed, and can be eaten.
* **House.** Modes `house`, `leaving`, `entering` and `eyes` are never
  player-driven: `decide()` only defers for `mode === 'normal'`. The one
  concession to playability: `Game.preferredInside()` prefers the human ghost
  and `Game.houseLimitFor()` returns 0 for it, so the player is not left
  bouncing inside the house for 60 pellets doing nothing.
* Cruise Elroy still applies if the human drives Blinky: it is a speed rule
  tied to the pellets left, not a targeting rule.

### Networking

Host authority is unchanged. The driver sends an **intent**, never a position:

sent immediately on change and re-sent every `CFG.VS.DIR_EVERY` ticks. It is a
standing intent rather than an event, so a lost message is repaired by the next
one. It replaces the driver's `pos` messages entirely (`Versus.sendDir()` short
-circuits `sendGuestUpdates()`) and doubles as his keep-alive: `netWatch` and
`posWatch` are fed by any message from that seat, and his pac is `out` so the
per-seat watchdog skips it anyway.

The host applies it in `hostGuestEvent` → `Versus.setWish()`. Snapshots gained
two fields: `s.vs` (the hunter's score) and `w` per ghost (its wish), so every
other client simulates the human ghost the same way between snapshots.

On the driver's own screen the ghost is simulated locally with authority, like
the guest's own Pac-Man: `applySnapshot()` does **not** copy its position unless
the mode changed (eaten, leaving the house) or the two have drifted more than
`CFG.VS.RESYNC_PX`. Copying every snapshot would be a visible tug on every
message, because the host is one network trip behind in applying the intent.

Divergence is bounded, not eliminated: if the intent lands after the host's
ghost has passed a junction centre, the two take different corridors and the
driver's screen has to accept the host's version. Measured with two simulated
browsers, 100 ms one-way lag and a player re-aiming six times a second, that
is about 4 corrections a minute, the largest around 10 px. The threshold is
deliberately *below* one tile: with a high threshold the drift compounds until
the two are in different corridors and the correction becomes a two or three
tile jump (14 px threshold: same number of corrections, but 19 px each).

`specView` carries `gh` (the ghost assignment) so spectators see who is who.

`CFG.NET.PROTO` goes 4 → 5: the roster, the snapshot and `gevt` all gained
fields, and an old client would silently play against an AI ghost.

### Scoring, records and player level

* Pac-Men keep the shared team score (`Game.score`).
* **Each hunter has his own**: `Game.vsScores` is one score per seat, read with
  `vsScoreOf(i)` and fed by `addVsScore(i, pts)`, `CFG.VS.CATCH_POINTS` (1000)
  per Pac-Man caught. The share-out allows **more than one** player-driven
  ghost (`Versus.clean` only insists that some Pac-Man is left), and a single
  shared counter could not say who did what — nor split the XP, since
  `myPoints()` feeds it. `Game.startDeath(who, byGhost)` takes the ghost that
  made the catch (the guest reports it in `gevt {t:'died', g}`) and forwards it
  to `Versus.onCatch()`, which pays **the owner of that ghost**.
  `Versus.hunters(game)` lists them with `{idx, name, ghost, score, catches}`
  and `topHunter()` picks the headline; catches are derived from the score
  (`score / CATCH_POINTS`) so they also add up on a guest's screen, which only
  receives the scores. The snapshot field `vs` is that array — hence
  `CFG.NET.PROTO` 6.
* `Versus.winner(game)` returns `'ghost'` when every Pac-Man seat is `out`
  (the hunter ran them out of lives) and `'pacs'` otherwise — surrender,
  disconnect or quitting all count as a Pac-Man win. The GAME OVER panel leads
  with it (`UI.versusLines()`).
* Versus rounds do **not** touch the world ranking (`submitRanking`), the local
  high scores (`persistHighScore`) or the mastery badges (`checkBadges`): the
  settings are not comparable.
* They **do** count for the player level, which measures how much you play.
  `Game.myPoints()` returns the seat's own points — `vsScoreOf(seat)` for a hunter,
  `score` for a Pac-Man — and `closeRun()` uses it for the XP, the end-of-run
  summary and the local history.

### On-screen identity

`Versus.drawMarks()` draws a small pulsing triangle above each player-driven
ghost (white for your own, pale pink for someone else's), skipped while the
ghost is hidden during an eat freeze. The name tag over the ghost during
"¡LISTO!" comes for free from `Game.actorFor()`. In the HUD,
`Game.hudNameFor()` appends the hunter's score to his name.

### Local two-keyboard versus

`setting.vsGhost2` (-1..3, chosen in OPTIONS · PARTIDA) is passed as
`ghosts: [-1, vsGhost2]` when starting a two-player local game. No extra
plumbing was needed: `Game.setPacDir()` is the single funnel for keyboard,
d-pad and swipe input, and `Versus.steer()` intercepts it there.

## Daily challenge, seasons and alternative mazes

**Reto diario** (`PM.Reto`, `CFG.RETO`): one identical run for everybody,
every day. The engine's randomness was already reproducible
(`Game.seedRnd`), so the challenge simply hands the **same seed to every
machine**: `Game.seedBase` is added to every reseed (`resetLevel`,
`respawn`), which shifts the whole run at once without touching a single
rule. With `seedBase = 0` the classic game is bit-for-bit what it was.

- The day is `YYYY-MM-DD` in **UTC** (`Reto.hoy()`) on purpose: the
  challenge must roll over at the same instant everywhere, or a player
  could get two runs by crossing local midnight. `Reto.semilla(fecha)` is
  an FNV-style hash of that string **capped at 1 000 000** — `seedRnd`
  multiplies by 2654435761, and a bigger value would lose precision in a
  double and stop being reproducible.
- `Reto.opts()` returns `{players:1, reto:true, seed, cfg}` where `cfg` is
  `CFG.PRESETS.normal`: nobody plays with slower ghosts or a faster
  Pac-Man, or the boards would compare nothing.
- **One attempt a day.** `Game.closeRun()` (which already runs exactly
  once per run, however the run ends) calls `Reto.cerrar(score, level)`,
  and `cerrar` is a no-op once the day is closed. Recording only at GAME
  OVER would let a player walk out of a bad run and start over.
- **The day's slot lives in the database**, not in the browser: a unique
  index on `(fecha, upper(btrim(nombre)))` means the second mark of the day
  is rejected (PostgREST answers **409**, which `Reto.submit` reports as
  `YA TIENES MARCA DE HOY`). Leaving it to `localStorage` made the rule
  cosmetic — play on the PC, play again on the phone, send the better of
  the two.
- To avoid burning a run that the server was going to reject,
  `Reto.sincronizar()` asks **before playing** (`reto_top` filtered by
  `jugador` and `fecha`) and copies the remote mark into this browser with
  `otro: 1`. It runs from `refreshReto()` (portada), `showRetoPrompt()`
  (which re-renders itself if the answer says the day is spent) and when
  the RETO DE HOY tab opens; `playReto()` checks once more before starting.
  It deliberately has **no in-flight lock**: a request that never settles
  would otherwise disable the check for the rest of the session.
- Local state is one localStorage row (`CFG.RETO.KEY`):
  `{f: date, p: points, n: level, e: 1 when uploaded, otro: 1 when the
  board's mark was made elsewhere}`. Playing offline is therefore normal,
  not an error path: the mark is kept and `Reto.enviarPendiente()` uploads
  it later — it runs from `showMenu` and whenever the RETO DE HOY tab is
  opened. A `409` there stops the retries (`e = 1`), because the slot is
  taken and resending will never place it.
- The board is its own table (`supabase/reto.sql`, read through the
  `reto_top` view, one row per name per day). It is separate from
  `ranking` because it is a different game (fixed seed, fixed settings,
  one attempt); folding it in would have meant filtering it out of every
  existing query.
- **A registered name belongs to its account.** With one slot per day,
  anyone could otherwise post 10 points as someone else and leave them
  without a challenge, so the insert policy requires `auth.uid()` to match
  when `nombre` exists in `perfiles` — and `Reto` signs its requests with
  the session token when there is one. Names without an account stay open,
  as before.
- A challenge run is a **normal 1-player run** for everything else:
  history, achievements, badges, player XP and the world ranking.

**Temporadas** (`PM.Season`, `CFG.RANKING.VIEW_SEASON`): the world board
is split by **calendar month**, derived from `creado_en` — nothing to open
or close by hand. `supabase/temporadas.sql` adds
`ranking.temporada` as a **generated stored column**
(`to_char(creado_en at time zone 'UTC', 'YYYY-MM')`), so existing rows are
filled in automatically and **no row is written or deleted**; the old
`ranking_top` view is untouched and remains the HISTÓRICO. The new
`ranking_temporada` view is `ranking_top` grouped by month as well, with
the same columns so the panel renders both lists with one code path. The
month is computed in UTC on both ends — a client using its own timezone
would ask for a different season than the server around month boundaries.

**Laberintos** (`PM.Mazes`, `CFG.MAZE_CLASSIC`, `CFG.setMaze`): a separate
mode. The 1980 layout is what makes the memorised patterns work, so it is
kept verbatim in `CFG.MAZE_CLASSIC` and `CFG.setMaze(rows)` swaps
`CFG.MAZE` (and recounts `CFG.PELLET_TOTAL`, since each maze has its own
pellet count and level completion is driven by it). `Game.applyMaze(id)`
does the swap and rebuilds the two prebaked wall canvases, guarded by
`Game.mazeLoaded` so nothing repaints for nothing; `newGame` applies
`opts.maze` **before** `resetLevel()` (which deals the pellets) and
`toMenu` restores the classic **before** `loadPellets()`. A maze run sets
`Game.mazeId`, which blocks both `submitRanking()` and `canTimeRecord()`:
scores from another layout compare to nothing. XP still counts.

Each maze is authored as its **left half only** (14 columns) and mirrored,
which is where the arcade look comes from. Rows 9–19 are **copied from the
classic**, never retyped: they carry the ghost house, its door, the tunnel
row and the no-up tiles, and the engine addresses those tile by tile.
`js/tests.js` enforces the rest: every pellet reachable from Pac-Man's
spawn (BFS with tunnel wrap), the declared pellet count, **no dead ends**
(a ghost that enters one is stuck and the chase is over), four energizers
in the four corners, left-right symmetry, a closed border except the
tunnel, and the classic coming back when the mode is left.

## Top mundial integrity (only the Edge Function writes)

**Server-side validation** (`supabase/functions/enviar-record/index.ts`):
submissions no longer go to PostgREST. `Ranking.submit()` POSTs to
`/functions/v1/enviar-record` with the anon key (the gateway's default JWT
check is enough — the anon key *is* a JWT), and the function is the only
writer: `supabase/ranking-integridad.sql` revokes `insert` on `ranking` from
`anon`/`authenticated` and drops the public insert policy, leaving public
`select` untouched. The function inserts with `SUPABASE_SERVICE_ROLE_KEY`,
which bypasses RLS; both env vars are injected by Supabase, no secrets to
create.

Payload: `{ jugadores (1..4), modo, nombre1..nombre4, puntos, nivel, nivelInicio,
fantasmas, tiempoMs, ajustes:{velFantasmas,velPac,powerS,vidas}, tiempo1?,
repeticion? }`.

Checks, all mirroring the tables in `js/config.js` (if a scoring table
changes there, it must change in the function too):

| Check | Rule |
|---|---|
| Score ceiling | per level `240*10 + 4*50` pellets `+ 4*(200+400+800+1600)` ghosts `+ 2*fruit(level)`, summed over `nivelInicio..nivel`, `*1.1` slack |
| Ghosts | `<= 16` per level (4 per energizer, an eaten ghost returns as eyes and cannot be re-eaten in the same fright), and `puntos >= 200*fantasmas` |
| Time | `>= 12 s` per cleared level and `<= 1000` points per second |
| Level-1 mark | only for `jugadores === 1`, `nivelInicio === 1` and untouched speed/fright (`CFG.TIME_RULES`); `>= 20 s`, and it cannot exceed the run's own clock. Failing the settings rule drops `tiempo1` to NULL instead of rejecting the row |
| Settings | rejects anything *easier* than default: `velFantasmas < 1`, `velPac > 1`, `powerS > 1`, `vidas > 3`. Harder settings are fine |
| Name | `nameAllowed()` reimplemented server-side (same leet-folding + `CFG.BAD_WORDS`), control chars stripped, `NICK_MAX` |
| Flood | 5 rows per name per minute, counted over the last minute's rows; the `ranking_freno` trigger stays as a second barrier |

Bounds are deliberately loose — the point is to make 999999 impossible, not
to litigate a great run. Replies are `{ ok, verificado }` on 200 and
`{ ok:false, error, detalle }` on 4xx, where `error` is a short uppercase
string the GAME OVER panel prints as-is and `detalle` goes to the console.
`Ranking.submitError()` maps 404/401/403 (function not deployed yet) to
`NO ESTÁ DISPONIBLE` and logs the deploy command; **a missing function never
breaks a run** — the game only flashes the reason.

**Replays** (`repeticion jsonb`, `verificado boolean`): the v1 format is
`{ v:1, modo, semilla, nivel, jugadores, ajustes, nombres, fecha,
entradas:[[tick,jugador,dir],…], final:{puntos,nivel,fantasmas,tiempoMs} }`.
When one is attached, the function checks it is **structurally** coherent —
version, settings equal to the submitted ones, `final` matching the submitted
score/level/ghosts/time (500 ms slack on the clock), input density plausible
(`<= 20` inputs per second, ticks non-decreasing and inside the run at
60 ticks/s, player index and direction in range) — and sets `verificado`.
An incoherent replay rejects the whole submission: a replay that contradicts
its own score is evidence, not noise.

**Pending: real replay verification.** Nothing here re-simulates the game, so
`verificado` means "the replay does not contradict itself", not "this score
was really achieved". Doing it properly means running the deterministic core
(`config.js`, `pacman.js`, `ghost.js` and the step loop of `game.js`, which
is already seeded and tick-based) inside the function: feed `entradas` at
their ticks, run to game over and compare the resulting score/level/ghosts
against `final`. The blocker is packaging — those modules are browser IIFEs
over `window.PM`, so it needs either a small Deno shim providing a fake
`window` (cheap, but it pins the function to the game's file layout) or a
build step that emits an engine module shared by both. Until then the honest
reading of the column is "worth a look", and the ceiling checks above are
what actually keeps the board clean.

---

## Menú de pausa (P / Esc)

Pausing no longer just dims the maze: it opens a menu (the same `#prompt`
overlay) with three actions, each with a keyboard shortcut shown under the
label (`.btn-key`):

| Acción | Tecla | Efecto |
|---|---|---|
| REANUDAR | `P`, `Esc`, `Enter` | unpause (online: coordinated as before) |
| REINICIAR | `R` | new game, same options (`Game.lastOpts`) |
| SALIR | `Q` | back to the menu (online: sends `bye`) |

- The menu is state-driven: `UI.syncPrompt()` shows it whenever
  `Game.paused` is true in a game, so in online **both** players see it (the
  pause is coordinated and arrives via `pause` events/snapshots).
  `Game.setPaused(on)` only refreshes the UI when the value actually changes,
  so 12 Hz snapshots never rebuild the dialog under the player's finger.
- REINICIAR is immediate in 1-player and local 2-player; **online it is a
  vote** (`kind: 'restart'`, same machinery as surrender/rematch: request →
  accept/reject, 20 s timeout, host executes and broadcasts `rematch`). A
  rejection/timeout keeps the game paused and shows the notice in the menu's
  status line.
- The menu is **see-through**: `#prompt` uses `rgba(0,0,0,0.45)` and the
  canvas drops its own veil to 0.25 while it is up (0.6 otherwise), so the
  maze stays readable behind it; text gets a shadow and the buttons an opaque
  background for legibility. The GAME OVER panel opts into `.solid` (0.85) —
  there is no live game to look at there. The canvas "PAUSA" label is skipped
  while the menu is up (it would show through underneath).
- Dialog shortcuts in general: buttons declare `keys: [...]`, `showPrompt()`
  registers them in `UI.promptKeys` and `UI.handlePromptKey(ev)` dispatches
  them. While a dialog is open the keyboard drives *only* the dialog (no
  Pac-Man movement). Vote dialogs: `Enter` accepts, `Esc` rejects. GAME OVER
  panel: `R` plays again, `Q`/`Esc` goes to the menu.

## Navegación con flechas (menús y diálogos)

Every panel and dialog is fully keyboard-operable: arrows move the focus,
`Enter`/`Space` activate. `UI.handleNavKey(ev)` runs **before** the dialog
shortcuts and the game input, and only when a panel or a prompt is on screen
(`UI.visiblePanel()` / `promptOpen`), so in-game arrows still drive Pac-Man.

- `UI.navItems(host)` collects the visible focusable controls in DOM order
  (buttons, ranges, text and colour inputs); a hidden tab pane has no layout
  box, so its controls are skipped automatically.
- Up/Down and Left/Right step through that list and wrap around; the focus
  ring is an explicit `:focus` outline (programmatic focus does not always
  count as `:focus-visible`).
- Exceptions that keep native behaviour: Left/Right inside a text field move
  the caret, and Left/Right on a focused slider adjust its value (Up/Down
  still navigate away from it).
- Opening a dialog focuses its primary button, so `Enter` confirms straight
  away. In `.prompt-btns` the hover/focus rules set background *and* colour
  together — setting only one leaves black text on a dark button.

## Pestañas del panel de opciones

OPCIONES is split into three tabs (`UI.tabPanes` / `UI.showOptionsTab`),
because the single scrolling list had grown unusable:

- **DIFICULTAD** — presets, the five sliders and their note.
- **JUGADORES** — names, and per player colour + skin.
- **PARTIDA** — lives mode in 2-player and the in-game key reminder.
- **SONIDO** — mute, the five per-category volume sliders and buttons to
  preview each streak voice.

VOLVER stays outside the tabs. Switching tabs resets the panel scroll.

The header must not move when the tab changes: `#options`/`#badges` drop the
`::before`/`::after` spacers that vertically centre the overlay (otherwise
the block re-centres and the title and tabs jump every time the pane below
changes height) and align to the top instead. The `.tab-row` is `sticky` so
it also stays visible while scrolling a long pane.

**Desktop layout (`min-width: 601px` / `1000px`).** Panels used to be
`position: absolute` inside `#stage`, which is exactly the canvas box (784 px
wide on a 1920×1080 screen, since `fitCanvas` derives the scale from the
window *height*) — everything piled into one narrow column. From 601 px up,
`.overlay:not(#prompt)` is `position: fixed` with a solid `#000` background;
from 1000 px up the content splits into columns. Two breakpoints on purpose:
601–999 px was the worst case (small canvas, content overflowing), and there
the window width already suffices.

`#prompt` is excluded from both: its dialogs sit over a live game and the
translucent veil that keeps the maze visible is the point. `#stage` must keep
measuring exactly the canvas — `#gameBtns`, `#emoteBar` and `#chatBox` are
injected into it and positioned against it.

**Never set `display` on `.overlay` or `.tab-pane` from CSS**: `showPanel()`
and `showOptionsTab()` write it as an inline style, which always wins.
`flex-direction`, `flex-wrap`, `order` and `gap` are fair game — that is what
the column layouts use. (`visiblePanel()` and nine other places also identify
the open panel by `el.style.display !== 'none'`, so moving visibility to a
class would break arrow-key navigation silently.)

The menu is four blocks (`.menu-head`, `.menu-main`, `.menu-side`,
`.menu-cast`, in that DOM order) turned into three columns with `order`. DOM
order stays name → play → side buttons, so arrow keys reach UN JUGADOR first;
`.menu-cast` is visually leftmost but last in the DOM, which is harmless
**only because it contains nothing focusable** — putting a button in there
would make the focus jump across the screen.

Tabbed panels (OPCIONES, PERFIL) **keep their tabs** at every width — showing
all four panes at once read as clutter. What the width buys is that the
sections *inside* the open pane spread into columns: each is a `.opt-group`
card (`UI.optGroup(pane, title, wide)`), and `.tab-pane` becomes a wrapping
flex row above 1000 px. `.opt-wide` spans the full width for one-line
sections (NOMBRES, the profile header, the avatar grid).

**Scrollbars** are styled to match the cabinet (square blue thumb on a black
track, yellow while dragged, no arrow buttons) with `::-webkit-scrollbar-*`.
The standard `scrollbar-width`/`scrollbar-color` pair lives inside
`@supports not selector(::-webkit-scrollbar)` — Chrome ignores every
`::-webkit-scrollbar-*` rule as soon as it sees those two properties and
falls back to its own rounded bar, so they must only reach Firefox.

## Surrender & rematch (both players must accept)

- **Surrender**: `RENDIRSE` button in the in-game top-right bar (all devices;
  the touch-only `❚❚` pause button sits next to it). 1-player asks for a
  simple confirmation; in any 2-player mode **both must accept**.
- **Rematch**: GAME OVER no longer returns to the menu on its own. After the
  ~3 s label the game stays in `GAME_OVER` with `overIdle = true` and shows a
  panel (names, score, record, level) with "OTRA PARTIDA"/"JUGAR OTRA VEZ"
  and "MENÚ". Local modes restart immediately (`Game.restartGame()` reuses
  `Game.lastOpts`); online it is a vote, and on acceptance the host sends
  `rematch` and both call `newGame` with the same options (same duo, same
  colours, names, host settings and lives mode).
- **Run summary**: closing the run is what awards the last achievements and
  the player-level XP, and those play as animations over the maze. The panel
  therefore **waits for them**: `enterGameOverIdle` sets `overWait =
  celebrating()` (any `achNotice`/`achNotices`/`badgeNotice`/`levelNotice`),
  `Game.stepOverWait()` — called from `step()`, not `stepGameOver()`, so a
  pause cannot strand it — clears the flag and re-syncs, and `syncPrompt`
  only opens the panel when `overIdle && !overWait`. `Game.closeRun()` stores
  `Game.runSummary = {puntos, nivel, exp, lvlAntes, lvl, lvlPct, lvlEn,
  lvlPide, logros[]}` (`logros` accumulated in `Game.runAch` by `bumpAch`),
  and `UI.buildRunSummary()` renders it inside the panel: player level (in
  yellow with "¡SUBES AL NIVEL...!" when it rose), XP gained with the level
  bar, and one row per achievement won in that run (star + name + condition),
  or "SIN LOGROS NUEVOS ESTA VEZ". Spectators get no summary.
- All three (`surrender`, `rematch`, `restart`) share one mechanism
  (`Game.vote = {kind, role, local, ticks}`; texts in `UI.VOTE_TEXT`):
  requester → `vote{k}` → responder accepts/rejects → `voteRes{k, ok}`. The
  **host always executes** (surrender → `gameOver`, rematch → `rematch`); the
  guest waits for the host's event. A surrender vote pauses the game (the
  host owns the pause and broadcasts it) and un-pauses on reject/timeout.
  20 s timeout (`CFG.NET.VOTE_TICKS`), countdown shown in the dialog (only
  the status line is rewritten, never the buttons). Rejections/timeouts show
  a short cyan notice over the maze (`Game.flash`) or in the panel's status.
- Dialogs are HTML overlays (`#prompt`, z-index above the other panels);
  while one is open the D-pads, the pause and surrender buttons and the
  keyboard are disabled. `UI.syncPrompt()` rebuilds the dialog from
  `Game.vote` / `Game.overIdle`, so state and UI cannot drift apart.
- During GAME OVER the connection stays alive (snapshots keep flowing) and
  the 8 s watchdog now also applies there; a peer leaving from the panel
  sends `bye` → "EL OTRO JUGADOR HA SALIDO" → menu.

## Color de Pac-Man

Settings panel offers preset swatches: #ffff00 (clásico), #ff0000, #00ffff,
#00ff00, #ff69b4, #ff8c00, #b19cd9, #ffffff — plus `<input type="color">`.
Applies to Pac-Man body, death animation and lives icons.

## UI text (Spanish)

Title screen: "PAC-MAN" (big, yellow), subtitle "TOP MUNDIAL", buttons
"JUGAR" and "OPCIONES", hint "FLECHAS O WASD PARA MOVERTE · P PARA PAUSA".
Options panel: "OPCIONES", sections "DIFICULTAD" (FÁCIL/NORMAL/DIFÍCIL +
sliders "VELOCIDAD FANTASMAS", "VELOCIDAD PAC-MAN", "DURACIÓN POWER PELLET",
"VIDAS", "NIVEL INICIAL"), "COLOR DE PAC-MAN", "SONIDO" (SÍ/NO), "VOLVER".
In-game: "¡LISTO!", "PAUSA", "GAME OVER" (red). Ghost names on title screen
(classic character/nickname intro is optional).

## Sprites (js/sprites.js — all procedural, PM.Sprites)

- `drawPacman(ctx, x, y, dir, mouthPhase, color)` — filled arc; 3 mouth frames
  (closed / half 40° / open 80°), animates ~every 2 ticks while moving.
- `drawGhost(ctx, x, y, dir, ghostId, mode, animPhase, flashOn)` — dome +
  3-bump wavy skirt (2 alternating skirt frames ~every 8 ticks); eyes with
  pupils looking toward `dir`; body colors Blinky #ff0000, Pinky #ffb8ff,
  Inky #00ffff, Clyde #ffb852; frightened #2121ff body with #ffb8ae face,
  flash swaps to white body/red face; eyes-mode draws only the eyes.
- `drawFruit(ctx, x, y, fruitId)` — 8 fruits as ~14×14 pixel-matrix art
  (cherry, strawberry, peach, apple, grapes, galaxian, bell, key).
- `drawPacFace(ctx, x, y, r, color, exprId)` — emote faces (see below);
  `drawEmote` / `drawBadgeTag` wrap them in the speech bubble.
- Score popups drawn as small cyan text.

## Voces de racha (los únicos archivos de audio)

Eating frightened ghosts with the same energizer plays an escalating voice
line, one per ghost in the chain: **"el hueso" → "el diablo" → "el huesaso"
→ "el diablo coño"** (`CFG.VOICES` / `CFG.VOICE_NAMES`, files in `audio/`).

- The streak index is the chain position (`chainIndex` before its increment,
  clamped to 3), the same counter that drives 200/400/800/1600, so it resets
  with every energizer. The chain is **per team**: in 2-player it escalates
  across both players' kills.
- Loaded once via `fetch` + `decodeAudioData` on `AudioSys.init/resume` and
  played through the `voices` bus; a new line stops the previous one so they
  never overlap. Everything fails silently — with `file://` fetch is blocked,
  so the voices simply don't play and the rest of the game sounds the same
  (the SONIDO tab says so when nothing loaded).
- Online the host owns the chain: `evt eatGhost` carries `c` (the streak
  index) and the guest plays that line, so both hear the same escalation.

## Audio API (js/audio.js — window.AudioSys, mostly Web Audio synthesis)

**Volume buses**: `master` feeds `ctx.destination`, and four category buses
feed `master` — `music` (intro), `sfx` (waka, ghost/fruit, death, extra
life), `loops` (siren/fright/retreat ambience) and `voices` (streak lines).
`setVolume(cat, 0..1)` / `getVolume(cat)` drive them, the settings
`volMaster/volMusic/volSfx/volLoops/volVoices` persist them, and `muted`
still forces the master to 0 on top. `blip(..., bus)` picks the category
('sfx' by default).

`init()` (lazy AudioContext), `resume()` (call on first user gesture),
`setMuted(b)`, `playIntro()` → returns duration ms (~4200; two-voice square
melody evoking the classic opener — do NOT transcribe the original score,
compose an evocative original), `playWaka()` (alternating two short chomp
blips, called per dot), `startSiren(stage 0..4)` / `stopSiren()` (looping
pitch-sweep drone, base pitch rises with stage; stage from dots remaining:
>200→0, >130→1, >70→2, >30→3, else 4), `startFright()`/`stopFright()`
(fast warble loop), `startRetreat()`/`stopRetreat()` (high bleep loop while
eyes return), `playEatGhost()`, `playEatFruit()`, `playDeath()` (~1.5 s
descending sweep + sputter), `playExtraLife()`. Only one of
siren/fright/retreat audible at once (retreat > fright > siren priority).
game.js must guard every call (`window.AudioSys && AudioSys.playWaka()`).

## Multiplayer (2 players, local & online)

Menu offers: UN JUGADOR · DOS JUGADORES (same machine) · JUGAR ONLINE ·
OPCIONES. Shared 2-player rules (both modes):

- **Team score**: one scoreboard for both ("EQUIPO" replaces "1UP" in the
  HUD); ghost-eat chain and fruit go to the team. One extra life at 10 000
  (to the pool in shared mode; +1 to each active player in individual mode).
  Separate persisted high score `pacman-topmundial-highscore-2p`.
- **Lives** (`livesMode`): `'shared'` (default) = one team pool (the VIDAS
  slider), lives icons drawn white; `'individual'` = each player gets VIDAS
  lives (icons in each player's color, ≤3 shown), a player at 0 becomes a
  spectator, GAME OVER when everyone is out. Any death runs the classic
  full-reset sequence (ghosts home, global dot counter active).
- **Spawns** (`CFG.STARTS`, indexed by player count): symmetric on the
  classic row — P1 (11.5, 23) facing LEFT, P2 (15.5, 23) facing RIGHT
  ("J1"/"J2" labels shown during READY). 1-player keeps the classic
  (13.5, 23). With **3 and 4** (online party only) the extra players start
  on the top row (11.5/15.5, 5), never beside you; each gets its own colour
  from `CFG.PLAYER_COLORS`.
- **Ghost AI**: each ghost applies its own personality to the nearest alive
  player (euclidean tile distance); Inky still doubles from Blinky's tile;
  Clyde's 8-tile rule uses the chosen player. Players pass through each other.
- **Local controls**: J1 arrows, J2 WASD (1-player keeps arrows+WASD both).

**Online** (host = J1, guest = J2, colors exchanged in the handshake; the
host's difficulty settings + livesMode + startLevel are imposed):

- Rooms: 4-letter code (alphabet without I/O), shareable link `?sala=CODE`
  which auto-joins on load. The lobby **is the party** (see Party): the
  leader is J1 and `pstart` hands out the indices; whoever arrives once the
  game started gets `full` (unless they come to spectate). Protocol version
  `PM.CFG.NET.PROTO` (= 4) must match.
- Transport (`PM.Net`): Supabase Realtime broadcast channels over a minimal
  hand-written Phoenix WebSocket client (heartbeat every 25 s; no database
  usage), credentials in `js/net-config.js` (`PM.NET_CFG`). Dev transport
  via `?red=local` uses BroadcastChannel between two tabs of one browser.
  Every payload is wrapped `{s: senderId, d: data}`; after the handshake
  only the locked peer's messages are accepted.
- Authority: the **host simulates everything** (ghosts, schedule, house
  counters, Elroy, fruit, score, lives, state machine) and broadcasts
  snapshots every 5 ticks (~12 Hz; every 15th carries the full pellet
  bitmap as hex for self-healing). The **guest simulates only its own
  Pac-Man** locally (zero input lag), sends `pos {x,y,dir,nextDir,eaten[]}`
  every 5 ticks (sooner on turns/eats), and mirrors everything else from
  snapshots, dead-reckoning the host's pac and the ghosts between them.
- Guest prediction (confirmed by host events): eating dots/energizers
  (fright shown immediately), eating frightened ghosts (freeze + hide,
  host validates and replies `eatGhost` with chain points), own death
  (local freeze, host replies `death`). Pause: either player; guest's `P`
  sends `pauseReq`, host applies and broadcasts.
- Robustness: watchdog shows "ESPERANDO CONEXIÓN..." after 1.5 s without
  data and drops with "CONEXIÓN PERDIDA" after 8 s; leaving sends `bye`
  ("EL OTRO JUGADOR HA SALIDO" on the other side → menu). A hidden tab
  keeps simulating via a 100 ms interval pump (rAF stops in background).

### Wire messages (reference)

Every payload travels wrapped as `{s: senderId, d: data}`; once the game
starts only the locked peers are accepted (`Net.lockPeers`), plus `hello`
from third parties. Cells are indices `row*28+col`.

- Party (before the game, same channel): `phello {v, n, c, k}` →
  `proster {v, lider, m:[{s,n,c,k}]}` → `pstart {v, ord:[{s,n,c,k}], cfg}`;
  leaving is `pbye {lider?}`, rejection `pfull {to}`.
- Personal channel `usuario:<nick>`: `invite {code, from}` and
  `donde {}` → `aqui {code, jugando, n}`.
- Spectator: `hello {v, spec:1}` → `svista {v, to, n, nm[], co[], sk[], cfg}`
  plus an immediate full `snap`.
- Guest → host: `pos {x, y, d(ir), nd(nextDir), e:[cell], dy?}` every 5 ticks,
  sooner on turns or eats; `dy:1` while dying (keep-alive whose position the
  host must ignore); `gevt {t: 'died' |
  'ateGhost'{g} | 'ateFruit' | 'pauseReq'{on} | 'vote'{k} | 'voteRes'{k, ok} |
  'emote'{e} | 'chat'{m} | 'badge'{b}}` where `k` is `surrender` | `rematch`
  | `restart` and `b` is a `CFG.BADGES` id ('' = none yet).
- Host → guest: `snap {…}` every 5 ticks (every 15th adds `pm`, hex pellet
  bitmap); `evt {t: 'ready'{lvl,full,rt} | 'fright'{tk,fl} |
  'eatGhost'{g,pts,x,y,w,c:streak} | 'death'{w, g:last?} | 'levelDone' | 'fruitEat'{pts,w} |
  'extraLife' | 'gameOver' | 'pause'{on} | 'vote'{k} | 'voteRes'{k, ok} |
  'rematch' | 'emote'{w, e} | 'chat'{w, m} | 'badge'{w, b} | 'left'{i}}`.
- Both directions: `bye {}` on leaving. With 3 and 4 players a `bye` from a
  guest only benches that player (`left`), it does not end the game.
- `snap` fields: `st ph dph lph dp rt pz` (state/phases/pause), `lvl sc hs`
  (level/score/high), `gm el ft ffl ch` (mode/elroy/fright/chain),
  `fz hg ei` (eat-freeze/hidden ghost/eater), `dl de fa` (dots/fruit),
  `he` (cells eaten since last snap), `lv out` (lives/spectators),
  `pd[i]` (per-player death: `0` or `[phase, ticks]`; the guest ignores its
  own entry), `p0 {x,y,d,nd}` (host pac), `ps[i] {x,y,d,nd}` (every player,
  needed with 3 and 4 where each only knows its own; each client skips its
  own entry), `g[4] {x,y,d,m,f,lp}` (ghosts), `tm` (clock), `pm?`.

## Acceptance checklist (verifiers use this)

1. Loads from file:// with zero console errors; 244 pellets asserted.
2. Ghost targeting matches the four algorithms incl. Pinky/Inky UP-bug;
   tie-break priority and no-reverse rule correct; no-up zones enforced.
3. Scatter/chase schedule + forced reversals + fright timer pause correct.
4. Speed tables, tunnel slowdown, Elroy thresholds applied.
5. House exit counters (personal, global-after-death, failsafe timer).
6. Fruit spawn at 70/170 dots; correct fruit + points per level.
7. Difficulty presets + granular sliders + persistence work; color applies
   live to Pac-Man and lives icons.
8. Sounds: intro, waka, siren stages, fright, eat-ghost, retreat, death,
   fruit, extra life — all synthesized, muteable, and each category
   (music / sfx / loops / voices) with its own volume. The four streak
   voices escalate per chained ghost, reset with each energizer, count the
   team's kills in 2-player and stay in sync online.
9. Full game loop: menu → ready → play → death/level-up → game over → panel
   (play again / menu); pause works; high score persists.
10. Spanish UI throughout; crisp pixel rendering at scale.
11. Two-player modes: team score with its own persisted high score; shared
    lives (default) vs individual (spectator at 0, game over when all out);
    classic full reset on any death; each ghost targets the nearest alive
    player keeping its personality; symmetric spawns labelled with each
    player's name (J1/J2 if unset);
    local controls split (J1 arrows / J2 WASD); 1-player mode unchanged.
12. Online: create/join rooms by 4-letter code and `?sala=` link; host
    settings imposed and colors exchanged; guest's own Pac-Man has no input
    lag; dots, fright, ghost eats, fruit, deaths, level changes, pause and
    game over stay in sync; disconnect/leave notices work; joining a game
    already running is rejected with `full`; version mismatch is reported.
12b. Party: the group survives going back to the menu and finishing a game;
    the leader owns the roster and starts; 3 and 4 players each get their
    own index, spawn and colour; a member who leaves or goes silent is
    benched (with more than two) instead of ending everyone's game;
    invitations reach a friend by name; spectating a friend shows their
    game live without a Pac-Man and never counts as your own game.
13. Mobile: crisp scaling; swipe + on-screen D-pads (one centered, or two
    corner pads in local 2-player) and pause button, shown on touch devices
    only and only during a game; panels full-screen on small viewports;
    menus fully scrollable (no clipped title).
14. Collision is SAME TILE ONLY, in local modes and in the online guest's
    local simulation. Pac-Man and a ghost swapping tiles in the same tick
    pass through each other — the 1980 arcade did exactly that, and the
    original's patterns rely on it, so do NOT "fix" it. Eyes always pass
    through.
15. Names: entered on the title screen (and in OPCIONES, both fields kept in
    sync), saved, sanitised and shown in HUD, READY labels, lobby, dialogs
    and GAME OVER panel; exchanged online in the handshake.
16. Surrender: button during play; 1-player confirms, 2-player needs both
    yeses (online: request → accept/reject, game paused meanwhile, 20 s
    timeout, rejection notice, host executes). GAME OVER offers a rematch
    with the same duo and settings — a vote online, immediate in local
    modes — and no longer drops to the menu by itself.
17. 2-player death: only the dead player freezes and animates; ghosts, the
    schedule and the other player keep going; respawn with a 2 s blinking
    grace; the classic full reset happens only when the last one dies; game
    over when everybody is out. Holds in local and online (guest prediction
    confirmed by the host, no animation restart loops, no position rubber-band
    after respawning). 1-player behaviour is unchanged.
18. Walls drawn inset (thin blocks, wide corridors) with corners closing
    cleanly and the ghost-house door aligned.
19. Pause menu: P/Esc opens REANUDAR / REINICIAR (`R`) / SALIR (`Q`), with
    the shortcut printed on each button and working from the keyboard; both
    players see it online; restarting online is a vote and a rejection leaves
    the game paused. Dialog keys never leak into Pac-Man movement. The menu
    is see-through: the maze reads through it.
21. Arrows navigate every menu and dialog (Enter/Space activate, sliders
    adjust with Left/Right, text fields keep their caret) without stealing
    the arrows from Pac-Man during play. OPCIONES is split into the
    DIFICULTAD / JUGADORES / PARTIDA tabs.
20. Skins apply to the player, its lives icons and the options thumbnails,
    and travel in the online handshake; emotes (`1..6`) appear over the right
    Pac-Man on both screens exactly once; badges are handed out on new
    personal records and listed in MAESTRÍAS; team results reach the TOP
    MUNDIAL panel — one board per format (individual, duo, trio, squad), only
    with a real name for everyone who played, host only online, once per game
    — and a missing table is reported
    instead of crashing; online chat (`T`) delivers
    sanitised, rate-limited messages and blocks game keys while typing.
    Badges are tracked separately **per format** (solo, duo, trio, squad): a
    squad record never awards a duo badge, each track keeps its own record and
    announces its own tiers, and the panel shows the four with their own
    progress. Each tier costs `points × players`, and it is announced only the
    first time it is reached — and never across the maze while anyone else is
    playing.
22. Ghost decisions are taken on tile ENTRY (executed at the center) and the
    scatter↔chase reversal is immediate; frightened choices and the fruit
    timer come from the seeded generator, so the same level replays
    identically twice in a row. Pac-Man crosses a dot corridor at the
    Pac(dots) percentage of the tables (71/79/87), not slower.
23. Watching a friend's game runs on its own channel (`Net.openView` /
    `Net.gameSend`): the watcher's own party keeps its main channel, keeps
    beating and is still there on the way back. If that party starts a game,
    the view closes and the watcher joins it.
24. TOP MUNDIAL has a third board: fastest level 1, read from the
    `ranking_tiempo` view and shown as mm:ss.cc. The time is submitted the
    moment level 1 is cleared (not at game over), once per game, only for
    1 player, offline and with default multipliers and start level.
25. A dialog opened on top of a panel (level-up on returning to the menu,
    invites, watch prompts) gets `#prompt.over-panel` and hides what is
    behind it; over the maze it stays translucent on purpose.
26. Achievements are derived from stored counters (never from a flag), so a
    fresh device that signs in reproduces exactly the same list. Spectating
    records nothing; online counts only the local player's kills and fruit.
27. A skin below its level requirement cannot be selected — except the one
    already worn, which is never taken away. OPCIONES shows the level needed.
28. PERFIL renders every avatar in `CFG.AVATARS` without throwing, and an
    unknown avatar id falls back to the first instead of drawing nothing.
29. Accounts: usuario + contraseña only (no e-mail typed anywhere), usuario is
    the in-game name, and signing in MERGES cloud and local keeping the best of
    each — xp, records and counters never go down. Friends need an account.
