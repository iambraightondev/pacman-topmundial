# PAC-MAN VS. — documentación pendiente de integrar

Este archivo trae los tres textos que hay que meter en `CHANGELOG.md`,
`README.md` y `SPEC.md` cuando se junte la rama. Aquí no se toca ninguno de
los tres para no chocar con el resto de agentes.

---

## 1. Para CHANGELOG.md

```
## PAC-MAN VS.: uno de la party lleva un fantasma

- En la sala online hay un selector nuevo, JUGAR COMO FANTASMA: eliges a
  BLINKY, PINKY, INKY o CLYDE y ese fantasma deja de pensarlo la máquina. Los
  que ya lleva otro salen apagados, y siempre tiene que quedar alguien de
  Pac-Man (si no, el líder no puede empezar).
- El fantasma humano juega con las reglas de siempre: paredes, puerta de la
  casa, casillas donde no se puede subir, velocidades de cada nivel, el frenazo
  del túnel y el modo asustado cuando alguien se come un energizante. Tampoco
  puede darse la vuelta sobre sí mismo, igual que los otros tres. Lo único que
  cambia es quién decide el giro.
- Si se lo comen, vuelve a casa hecho ojos y sale por la puerta, como todos.
- Se le ve: lleva su nombre encima durante el "¡LISTO!" y una marca en punta
  sobre la cabeza toda la partida, blanca si es el tuyo. En el marcador va con
  el color de su fantasma y con sus propios puntos al lado.
- Puntúa cazando: 1000 puntos por cada Pac-Man que se lleva por delante. Al
  final el panel dice quién gana la ronda: el fantasma si acaba con todas las
  vidas, y los Pac-Man en cualquier otro caso.
- Estas partidas NO cuentan para el top mundial, ni para el récord, ni para las
  maestrías: con un fantasma que piensa, esa puntuación no compite con las
  demás. Sí cuentan para el nivel de jugador, que mide cuánto juegas: el
  cazador se lleva de experiencia los puntos que ha cazado.
- También se puede jugar en el mismo teclado: en OPCIONES · PARTIDA se elige el
  fantasma del jugador 2 y en DOS JUGADORES lo lleva él con WASD.
- Por red no viajan posiciones del fantasma, solo hacia dónde quiere ir: si el
  mensaje tarda, sigue recto un poco más y gira después, que es lo que hace
  cualquier fantasma. Nada de tirones ni de que aparezca en otro pasillo.
```

---

## 2. Para README.md (de cara al jugador)

```
### PAC-MAN VS. — llevar un fantasma

Hasta ahora los cuatro fantasmas los llevaba la máquina. Ahora uno de vosotros
puede ponerse en su lugar.

**En la party.** Entra en JUGAR ONLINE, crea o únete a una party y, debajo de
la lista, elige en JUGAR COMO FANTASMA. Puedes coger a BLINKY, PINKY, INKY o
CLYDE; el que ya lleve otro te sale apagado. Con PAC-MAN vuelves a lo de
siempre. Alguien tiene que quedarse de Pac-Man: si no, no se puede empezar.

**En el mismo teclado.** En OPCIONES · PARTIDA · PAC-MAN VS. eliges el fantasma
del jugador 2. Luego, en DOS JUGADORES, él lo lleva con WASD y tú tu Pac-Man con
las flechas.

**Cómo se juega con un fantasma.** Se mueve como los otros tres: no atraviesa
paredes, no puede darse la vuelta a mitad de pasillo, hay cruces donde ningún
fantasma puede subir y en el túnel se arrastra. Cuando alguien se come un
energizante te toca huir: te pones azul, te pueden comer y vuelves a casa hecho
ojos hasta que sales otra vez por la puerta. Para que no se te confunda con la
máquina llevas una punta encima todo el rato, y tu nombre al empezar.

**Quién gana.** Los Pac-Man puntúan como siempre, con su marcador de equipo. Tú
te llevas 1000 puntos por cada Pac-Man que cazas, y ganas la ronda si te quedas
con todas sus vidas; si la partida acaba de cualquier otra forma, ganan ellos.
El panel del final lo dice claro.

**Ojo:** estas partidas no entran en el TOP MUNDIAL ni tocan tu récord ni tus
maestrías (con un fantasma que piensa no es la misma partida). El NIVEL DE
JUGADOR sí sube: cuenta lo que hayas hecho tú, cazando o comiendo.
```

---

## 3. Para SPEC.md (técnico, en inglés)

```
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
no-up tiles, no reversal) and only then, for `human && mode === 'normal'`,
hands over to `Ghost.humanChoice(candidates)`:

1. the requested direction, if legal from here;
2. otherwise straight on — what a player who is not pressing anything expects;
3. otherwise the first legal exit in the usual UP > LEFT > DOWN > RIGHT order,
   because a ghost never stops.

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

```
gevt { t:'gdir', d:<0..3|-1>, i:<player index> }
```

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
* The hunter has his own: `Game.vsScore`, `CFG.VS.CATCH_POINTS` (1000) per
  Pac-Man caught. `Game.startDeath(who, byGhost)` now takes the ghost that made
  the catch (the guest reports it in `gevt {t:'died', g}`) and forwards it to
  `Versus.onCatch()`.
* `Versus.winner(game)` returns `'ghost'` when every Pac-Man seat is `out`
  (the hunter ran them out of lives) and `'pacs'` otherwise — surrender,
  disconnect or quitting all count as a Pac-Man win. The GAME OVER panel leads
  with it (`UI.versusLines()`).
* Versus rounds do **not** touch the world ranking (`submitRanking`), the local
  high scores (`persistHighScore`) or the mastery badges (`checkBadges`): the
  settings are not comparable.
* They **do** count for the player level, which measures how much you play.
  `Game.myPoints()` returns the seat's own points — `vsScore` for a hunter,
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
```

---

## 4. Otros archivos que hay que tocar al juntar

- **`sw.js`**: añadir `'./js/versus.js'` a `SHELL` (justo antes de
  `'./js/game.js'`) y subir `VERSION`. No se ha tocado aquí a propósito.
- `index.html`, `tests.html` y `pruebas-node.js` ya cargan `js/versus.js`.
