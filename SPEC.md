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
has. Locked ones render greyed in OPCIONES with the level they need.

**Perfil** (`#profile`, tabs PERFIL / LOGROS): avatar, name, level bar,
summary, avatar picker and the account box. Avatars (`CFG.AVATARS`) are drawn
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
cost progress. Friends require an account; `PM.Friends` is only a local cache
of the cloud list.

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
MUNDIAL 100 000) on **two independent tracks**, so a big duo run never hands
out the solo badges:

- `'solo'` — 1-player record (`Game.highScore1`)
- `'duo'` — team record (`Game.highScore2`)

Every API takes the mode (`best/earned/top/next/has/claim`), and
`Game.badgeMode()` derives it from `playerCount`. Earned badges are derived
from the record, so nothing can desync; localStorage (`CFG.BADGES_KEY`) only
stores which ones were already announced, now as `{solo:[], duo:[]}` — an old
flat array is migrated into both tracks so nothing gets re-announced.
`Game.checkBadges()` runs on **every score change** and shows the banner
(`Sprites.drawBadgeBanner`) each time the run crosses a tier — once per tier
per game, tracked in `Game.badgeRun`. Announcing only the first time in a
player's life meant anyone holding most tiers never saw it again; the
lifetime `claim()` now only decides the wording ("¡NUEVA MAESTRÍA DE …!" vs
"MAESTRÍA DE …!"). The guest also gets it when the snapshot brings the score.
The MAESTRÍAS panel has an EN SOLO / EN DÚO tab pair, each listing the six
tiers with that track's record, what is missing for the next one, and a `VER`
button that plays the banner in the panel (`UI.playBadgeDemo`, which advances
by a **capped** per-frame delta so a throttled browser slows it down instead
of skipping it). `Ctrl+Espacio` shows the badge of the **mode being played**.

**Showing off the badge in-game** (`Sprites.drawBadgeTag`, `t` from the
emote's remaining ticks): it has its own animation, deliberately **not** the
panel banner's — the medal rises **centred over the player** flipping twice
(edge-on frames draw the plain back), the plaque then **unrolls to its right**
out of the medal (which slides into its slot) with a spark burst, a glint
sweeps the medal while it holds, and it shrinks back toward the player to
leave. Face emotes keep their instant balloon.

**Top mundial** (`PM.Ranking`): games are posted to a Supabase table via
PostgREST with the anon key — no SDK. There are **two separate boards**, told
apart by the `jugadores` column: `1` individual (`nombre2` NULL) and `2` duo.
Reads go to the **`ranking_top` view**, which keeps only each player's/duo's
best run (`distinct on (jugadores, equipo)`) — otherwise whoever plays most
fills the whole table with repeats. The panel has INDIVIDUAL / DÚO / TUS
PARTIDAS tabs; switching fast is guarded by a request token, so a late reply
from the previous tab cannot overwrite the current list.

**Anti-spam y nombres**: a `before insert` trigger caps 5 rows per name per
minute (it is not anti-cheat — that would need an Edge Function — but it
stops flooding). `Ranking.nameAllowed()` rejects `CFG.BAD_WORDS` on a
normalised name (uppercase, leet digits folded back to letters, symbols
stripped), so a public board cannot be filled with insults; the GAME OVER
panel explains it. Local play is unaffected: the filter only gates the board.

**Historial** (`PM.History`, `CFG.HISTORY_KEY`): the last `HISTORY_MAX` games
of this browser, saved on every game over **regardless of name or network**,
shown in the TUS PARTIDAS tab (works offline).

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
would make the focus jump across the screen. OPCIONES hides `.tab-row` above
1000 px and shows all four panes at once as cards in `.options-grid`
(`display: flex !important` beats the inline `display: none`).

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
    personal records and listed in MAESTRÍAS; 2-player results reach the TOP
    MUNDIAL panel — individual and duo boards kept apart, only with a real
    name, host only online, once per game — and a missing table is reported
    instead of crashing; online chat (`T`) delivers
    sanitised, rate-limited messages and blocks game keys while typing.
    Badges are tracked separately for solo and duo: a duo record never awards
    a solo badge, each track announces its own tiers, and the panel shows the
    two with their own progress.
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
