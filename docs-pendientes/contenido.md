# Documentación pendiente · contenido nuevo

Reto diario, temporadas del top mundial y laberintos alternativos.
Aquí van los tres textos listos para pegar cuando se integre la rama: el
del CHANGELOG (arriba del todo, con la fecha del día), el del README (en
sus secciones) y el del SPEC (en inglés, en su sitio).

---

## 1 · CHANGELOG.md

```markdown
## 2026-08-05 · El RETO DE HOY, las temporadas y los laberintos alternativos

### RETO DE HOY

- **La misma partida para todo el mundo, cada día.** El azar del juego ya
  era reproducible —los fantasmas azules huyen según un contador, como en
  la máquina de 1980—, así que ahora se reparte **la misma semilla a todo
  el planeta**: mismos fantasmas, misma fruta, mismos ajustes. Dos marcas
  del mismo día se pueden comparar de verdad.
- **La fecha se cuenta en UTC**, no en el reloj de cada uno: el reto
  cambia **a la vez** en todo el mundo y nadie lo juega dos veces cruzando
  su medianoche.
- **Un intento al día.** La marca se cierra **cuando acaba la partida,
  acabe como acabe**: game over, rendición o salirte al menú. Salirse al
  ver que va mal no devuelve el intento. Después ya solo se puede mirar.
- **Botón RETO DE HOY en la portada**, que enseña tu marca en cuanto lo
  has jugado, y **pestaña propia en TOP MUNDIAL** con la clasificación del
  día y tu puesto.
- **Sin cuenta y sin conexión**. Con el nombre puesto basta, como en el
  resto del ranking. Y sin red se juega igual: la marca se queda guardada
  en este navegador y **se manda sola** en cuanto vuelve la conexión.
- **Suma experiencia** de nivel de jugador como cualquier partida.

### TEMPORADAS DEL TOP MUNDIAL

- El top mundial pasa a repartirse por **temporadas: un mes natural**,
  sacado de la fecha de la partida. No hay que abrir ni cerrar nada: el
  día 1 de cada mes empieza sola.
- **Pestañas ESTA TEMPORADA / HISTÓRICO** en INDIVIDUAL y en DÚO. En la
  temporada cuenta tu mejor partida del mes; en el histórico, la mejor de
  siempre.
- **No se pierde nada de lo que había**: las partidas que ya estaban
  entran solas en el mes que les tocaba y el histórico se queda
  exactamente como estaba.

### LABERINTOS

- **Tres trazados nuevos** de 28×31 —**ANILLOS**, **PANAL** y
  **COLMILLOS**—, cada uno con su túnel, su casa de fantasmas y sus cuatro
  energizantes en las esquinas. ANILLOS se corre en horizontal; PANAL es
  todo cruces seguidos; COLMILLOS deja el borde libre y llena el centro de
  dientes.
- **Van en un modo aparte**, con su propio botón y su ficha con el dibujo
  de cada uno. **El laberinto de 1980 no se toca**: es lo que sostiene los
  patrones memorizados, y por eso estas partidas **no entran en el top
  mundial** ni en la clasificación de velocidad del nivel 1. Experiencia
  sí, como todo lo que se juega.
```

---

## 2 · README.md

**En «Modos de juego», detrás de «Un jugador»:**

```markdown
- **Reto de hoy** — la misma partida para todo el mundo: mismo azar
  (fantasmas y fruta salen igual en la de cualquiera) y los ajustes de
  siempre, para que las marcas se puedan comparar. Cambia cada día a la
  vez en todo el planeta (se cuenta en UTC) y hay **un intento al día**:
  la marca se cierra cuando acaba la partida, te rindas o te salgas. Se
  juega sin cuenta —basta con tener nombre— y **sin conexión**: la marca
  se guarda y se manda sola cuando vuelve la red. La clasificación del día
  está en TOP MUNDIAL → RETO DE HOY, con tu puesto.
- **Laberintos** — dos o tres trazados nuevos de 28×31, con su túnel, su
  casa de fantasmas y sus energizantes en las cuatro esquinas. Es un modo
  aparte: **el laberinto original no se toca nunca**, así que estas
  partidas no entran en el top mundial (experiencia sí).
```

**En «Características», sustituyendo el punto de «Top mundial»:**

```markdown
- **Top mundial**: clasificaciones compartidas entre todos —**individual**,
  **dúo**, **nivel 1** (quién lo despeja en menos tiempo) y **reto de
  hoy**—, con la mejor marca de cada jugador. Individual y dúo se reparten
  por **temporadas** (el mes natural, calculado de la fecha): pestañas
  ESTA TEMPORADA e HISTÓRICO, sin perder nada de lo anterior. Hace falta
  tener nombre puesto (y sin palabrotas) para registrar un récord. La de
  velocidad se manda **en cuanto despejas el primer nivel**, así que
  cuenta aunque después te maten o te salgas, y solo vale a un jugador,
  sin red, en el laberinto clásico y con los ajustes de siempre.
```

**En «El TOP MUNDIAL» (configuración), al final:**

```markdown
Hay dos scripts más, que se ejecutan igual (Dashboard → SQL Editor → New
query → Run) y también se pueden repetir sin miedo:

- [`supabase/temporadas.sql`](supabase/temporadas.sql) — añade la
  temporada a la tabla `ranking` como columna **calculada** de la fecha y
  crea la vista por meses. No borra ni modifica ninguna fila: las partidas
  que ya estaban entran solas en el mes que les tocaba.
- [`supabase/reto.sql`](supabase/reto.sql) — crea la tabla del **reto
  diario** y su vista, con lectura e inserción públicas.

Si falta alguna, el panel lo dice y el resto del juego funciona con
normalidad.
```

**En «Estructura», entre `ranking.js` y `game.js`:**

```
js/temporadas.js  Temporadas del top mundial (mes natural)
js/reto.js        Reto diario (misma partida para todos)
js/mazes.js       Laberintos alternativos (modo aparte)
```

---

## 3 · SPEC.md (inglés)

**Nueva sección, detrás de «Top mundial … chat»:**

```markdown
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
- Local state is one localStorage row (`CFG.RETO.KEY`):
  `{f: date, p: points, n: level, e: 1 when uploaded}`. Playing offline is
  therefore normal, not an error path: the mark is kept and
  `Reto.enviarPendiente()` uploads it later — it runs from `showMenu` and
  whenever the RETO DE HOY tab is opened.
- The board is its own table (`supabase/reto.sql`, read through the
  `reto_top` view, best row per name per day). It is separate from
  `ranking` because it is a different game (fixed seed, fixed settings,
  one attempt); folding it in would have meant filtering it out of every
  existing query.
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
```

---

## 4 · Otros ficheros

- **`sw.js`** (no tocado a propósito): hay que añadir a `SHELL` los tres
  módulos nuevos, o sin conexión no se cargan —

  ```js
  './js/temporadas.js',
  './js/reto.js',
  './js/mazes.js',
  ```

  y **subir `VERSION`** (`pm-v16` → `pm-v17`) para que el service worker
  vuelva a precachear.
