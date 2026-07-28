# SPEC — Pac-Man clásico (web, HTML5 Canvas)

Faithful recreation of the 1980 arcade game's MECHANICS in 100% original code.
Do NOT copy any original Namco assets (no ripped sprites, no ripped audio). All
graphics are drawn procedurally on canvas; all audio is synthesized with Web
Audio API. UI language: **Spanish**.

## Hard constraints

- Plain JS, **no ES modules** (must run from `file://`). Classic `<script>` tags
  loaded in order. Shared state lives under the `window.PM` namespace.
- No external network resources (fonts, CDNs, images). Fully offline.
- Files (all inside the project root):
  - `index.html`
  - `css/style.css`
  - `js/config.js`  — constants, maze, level tables (defines `PM.CFG`)
  - `js/audio.js`   — `window.AudioSys` (see Audio API)
  - `js/sprites.js` — procedural sprite drawing (defines `PM.Sprites`)
  - `js/pacman.js`  — player entity (defines `PM.Pacman`)
  - `js/ghost.js`   — ghost AI (defines `PM.Ghost`)
  - `js/game.js`    — state machine + fixed-timestep loop (defines `PM.Game`)
  - `js/ui.js`      — menus, settings panel, color picker (defines `PM.UI`)
  - Script order in index.html: config, audio, sprites, pacman, ghost, game, ui.
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
     #.##### ## #####.#     
     #.##          ##.#     
     #.## ###--### ##.#     
######.## #      # ##.######
      .   #      #   .      
######.## #      # ##.######
     #.## ######## ##.#     
     #.##          ##.#     
     #.## ######## ##.######
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
- Wall rendering: blue (#2121ff) rounded line-style walls (double outline look
  of the arcade is welcome but a clean single 1px-style stroke per wall edge is
  acceptable); pink door; black background. Dots 2×2 px, energizers r=4 px
  blinking (~0.2 s on/off), color #ffb8ae.

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

## Ghost AI (the core of fidelity — implement exactly)

Ghosts pick a direction ONLY at tile centers when a decision is possible:
choose the legal direction (no reversing) minimizing **straight-line (euclidean)
distance from the candidate next tile to the target tile**; ties break by
priority UP > LEFT > DOWN > RIGHT. Reversal is forced only when mode switches
scatter↔chase or on entering frightened.

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

- Collision = same tile as a ghost (chase/scatter ⇒ lose life; frightened ⇒
  eat ghost; eyes ⇒ nothing).
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
  GAME OVER text.
- States: MENU → READY ("¡LISTO!" text, intro melody first time: ~4.2 s) →
  PLAYING → (DYING | LEVEL_DONE | GAME_OVER) → …  P or Escape = pause
  ("PAUSA"). Game-over returns to MENU after ~3 s.
- HUD: top "1UP" + score, "HIGH SCORE" + value (score font: bold monospace,
  white). Bottom-left: remaining lives as mini Pac-Mans (in the chosen color).
- Controls: Arrows + WASD. Touch: swipe on canvas.

## Difficulty & settings (contract used by ui.js + game.js)

```js
PM.settings = {
  difficultyPreset: 'normal',  // 'facil' | 'normal' | 'dificil' | 'custom'
  pacColor: '#ffff00',
  ghostSpeedMult: 1.0,   // 0.5–1.2, step .05
  pacSpeedMult: 1.0,     // 0.8–1.3, step .05
  frightMult: 1.0,       // 0–2, step .25  (× frightened duration)
  startLives: 3,         // 1–5
  startLevel: 1,         // 1–21
  muted: false
}
```

Presets — facil: ghost .85, pac 1.05, fright 1.5, lives 5, level 1;
normal: 1/1/1/3/1 (arcade exact); dificil: ghost 1.1, pac 1.0, fright .5,
lives 2, level 5. Editing any slider switches preset to 'custom'. Persist to
localStorage `pacman-topmundial-settings`; high score
`pacman-topmundial-highscore`. Changes to speed/lives/level apply on next new
game; color + mute apply live.

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
- Score popups drawn as small cyan text.

## Audio API (js/audio.js — window.AudioSys, all Web Audio synthesis)

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
   fruit, extra life — all synthesized, muteable.
9. Full game loop: menu → ready → play → death/level-up → game over → menu;
   pause works; high score persists.
10. Spanish UI throughout; crisp pixel rendering at scale.
