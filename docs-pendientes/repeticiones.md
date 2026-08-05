# Repeticiones de partida — documentación por integrar

Tres apartados listos para copiar: uno para `CHANGELOG.md`, otro para
`README.md` y otro para `SPEC.md`.

---

## CHANGELOG

```markdown
## 2026-08-05 · Volver a ver la partida que hiciste

- Cada partida se **graba sola**. No hay botón que pulsar ni nada que
  configurar: se juega igual que siempre y al acabar la repetición está ahí.
- **VER en TUS PARTIDAS**: en el panel TOP MUNDIAL, cada partida del
  historial que tenga repetición guardada sale con su botón `VER`. Se pulsa y
  la partida vuelve a jugarse sola delante de ti, exactamente igual que
  salió: los mismos giros, los mismos fantasmas, los mismos puntos.
- Se puede **pausar, ponerla a x2, empezarla otra vez o salirse** cuando
  quieras, y arriba queda el cartel de REPETICIÓN para que nadie se
  confunda con una partida de verdad. Ver una repetición **no cuenta para
  nada**: ni experiencia, ni logros, ni récord, ni top mundial.
- **Se comparte por enlace**: la partida entera cabe en la URL
  (`?rep=...`), así que se manda por WhatsApp y a quien lo abra se le pone
  el juego a reproducirla. Si el enlace llega roto, se avisa y a seguir
  jugando.
- Se guardan las **últimas 8 de este navegador** y, aparte, **la de tu mejor
  récord**, que no se borra aunque se acumulen partidas nuevas.
- Esto se puede hacer porque el juego **ya era determinista**: cada nivel se
  juega siempre igual (es lo que sostiene los patrones memorizados del
  arcade), así que una partida entera cabe en los ajustes con los que se
  jugó más la lista de giros con su tick. Ochenta caracteres para medio
  minuto de partida. Nada de vídeo ni de posiciones.
- De momento **solo se graban las partidas locales** (uno o dos jugadores en
  la misma máquina). Online la partida la simula el anfitrión y lo que ve
  cada uno depende de lo que llegue por la red, así que repetir las teclas en
  local no reconstruiría la misma partida.
```

---

## README

Va en **Características**, en el bloque de personalización, justo detrás de
«Tus partidas» (que es donde sale el botón), y la línea de `js/replay.js`
entra en **Estructura**.

```markdown
- **Repeticiones**: cada partida se graba sola y se puede **volver a ver**
  desde TOP MUNDIAL → TUS PARTIDAS, con el botón `VER` de cada partida.
  Sale el cartel de REPETICIÓN y controles para **pausar, ir a x2, empezarla
  otra vez o salirse**. Ver una repetición no cuenta para nada: ni
  experiencia, ni logros, ni récord. Y **se comparten por enlace**: la
  partida entera cabe en la URL, así que se manda por WhatsApp y al otro se
  le abre el juego reproduciéndola. Se guardan las últimas 8 de este
  navegador más la de tu mejor récord. Solo se graban las partidas locales
  (una o dos personas en la misma máquina).
```

```
js/replay.js      Repeticiones: grabar, reproducir, guardar y compartir
```

También conviene una línea en **Cómo jugar**, junto a los controles:

```markdown
- **Ver una repetición**: `P`/`Esc` la pausa (con velocidad, reiniciar y
  salir), y arriba hay una barra con los mismos controles a mano.
```

---

## SPEC

Sección nueva, después de «Difficulty & settings». Va tal cual, sin
envolverla en nada (lleva bloques de código dentro).

## Replays (`PM.Replay`, js/replay.js)

Every **local** game (1 or 2 players on the same machine) is recorded with
zero configuration. Online games are **not** recorded: there the host
simulates and each client mirrors what arrives over the wire, so replaying
the local key presses would not rebuild the same game.

Recording is possible because the game is already deterministic:
`Game.seedRnd(level)` makes every level play out the same way (that is what
makes the arcade's memorised patterns work). A whole game therefore fits in
the settings it was played with plus the list of turns with their tick —
about 80 characters for half a minute of play.

### Exchange format (version 1)

```js
{
  v: 1,
  modo: 'solo' | 'duo' | 'reto',
  semilla: null,        // null = derived by the game from the level
  nivel: 1,             // starting level
  jugadores: 1,
  ajustes: { velFantasmas, velPac, powerS, vidas },  // the settings that change the simulation
  nombres: ['ANA'],
  fecha: '2026-08-05T18:00:00.000Z',
  entradas: [[tick, jugador, dir], ...],   // dir 0..3, sorted by tick
  final: { puntos, nivel, fantasmas, tiempoMs }
}
```

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

A replay never counts: `xpSent`, `rankingSent` and `timeSent` are forced true
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

### Sharing and the world ranking

`Replay.enlace(rep|texto)` builds `<base>?rep=<texto>`; `UI.init()` calls
`Replay.desdeUrl()`, which opens the game straight into the replay and shows
a dialog (game unaffected) if the text is corrupt.

For the world ranking, which will carry a replay per row, the public entry
points are already there and need no change to this module:

```js
if (PM.Replay.hayRepeticion(fila)) { /* draw the VER button */ }
PM.Replay.verDelRanking(fila);   // false if the row has no replay, or a broken one
```

`fila.rep`, `fila.repeticion` and `fila.replay` are all accepted, so the
column name can still be decided server-side. The value is the same string
`serializar()` produces.

---

## Para el service worker

`sw.js` no se ha tocado (lo sube quien integra). Hay que añadir el archivo
nuevo a `SHELL` y subir `VERSION`:

```js
  './js/replay.js',
```

Va justo detrás de `'./js/game.js'`, que es el orden en el que lo cargan
`index.html` y `tests.html`.
