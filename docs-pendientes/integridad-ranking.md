# Integridad del TOP MUNDIAL — documentación pendiente de repartir

Este archivo NO va al repositorio como documentación final: es el material
para meter en `CHANGELOG.md`, `README.md` y `SPEC.md` cuando se revise el
cambio. Cada apartado va listo para copiar y pegar en su archivo.

Archivos del cambio:

- `supabase/functions/enviar-record/index.ts` — la Edge Function que valida
- `supabase/ranking-integridad.sql` — columnas nuevas y cierre de permisos
- `js/ranking.js` — el envío pasa por la función
- `js/game.js` — la partida manda con qué se jugó y avisa si no entró
- `js/tests.js` — cinco pruebas nuevas junto a las del ranking

---

## 1. Para CHANGELOG.md (en español, arriba del todo)

## 2026-08-05 · El TOP MUNDIAL deja de aceptar puntuaciones inventadas

- **El agujero**: la tabla del ranking aceptaba inserciones directas con la
  clave anónima, o sea que cualquiera podía abrir la consola del navegador y
  meterse 999999 puntos. El freno que había solo cortaba el spam (5 partidas
  por nombre y minuto), que no es lo mismo que cortar las trampas. Para un
  juego que se llama TOP MUNDIAL, era lo que más urgía tapar.
- **Ahora la partida pasa por un portero**: una Edge Function
  (`enviar-record`) que la mira antes de guardarla y que es **la única** que
  puede escribir en la tabla. A la clave anónima se le queda la lectura, que
  para eso la clasificación es pública.
- **Qué mira el portero**, con las tablas del propio juego:
  - **Que los puntos quepan**: cada nivel da como mucho 2600 de pastillas,
    12000 de fantasmas (cuatro energizantes por una cadena de
    200+400+800+1600) y dos frutas. Sumado desde el nivel de salida hasta
    donde se llegó, ese es el techo. Los 999999 de la consola no caben ni de
    lejos.
  - **Que el tiempo cuadre**: ni una partida de doce niveles en medio minuto,
    ni más de 1000 puntos por segundo. Los suelos son generosos a propósito:
    antes tirar una trampa que la partida de alguien.
  - **Que los fantasmas cuadren**: como mucho 16 por nivel, y cada uno son
    200 puntos por lo bajo.
  - **Que el nombre valga**: el mismo filtro de siempre y las 12 letras de
    siempre, pero ahora también del lado del servidor.
  - **Que los ajustes sean los de siempre**: con los fantasmas frenados,
    Pac-Man acelerado, los energizantes alargados o más de tres vidas, la
    partida no entra. Es el mismo criterio que ya tenía la marca de velocidad
    del nivel 1: una marca con el juego rebajado no se puede comparar con la
    de nadie. Jugar más difícil de lo normal sí entra, faltaría más.
  - **Y el freno de siempre**: cinco partidas por nombre y minuto.
- **La repetición de la partida se puede adjuntar**: si viene, se comprueba
  que cuadre con lo que se manda (versión, ajustes, marcador final y una
  densidad de órdenes propia de un humano) y la fila queda marcada como
  `verificado`. Rejugarla de verdad con el motor queda pendiente.
- **Si el portero no está**, el juego no se entera de nada raro: la partida
  termina igual y el panel de GAME OVER dice por qué no entró en el top.

---

## 2. Para README.md (de cara al jugador)

> Sustituye los dos últimos párrafos de la sección **### El TOP MUNDIAL**
> (el que empieza "Si alguna vez hay que recrearla…" se queda; el que dice
> que las puntuaciones "se pueden falsear" desaparece).

Las partidas **no se escriben directamente en la tabla**: se mandan a una
Edge Function del proyecto, `enviar-record`, que las revisa antes de
guardarlas y que es la única con permiso para escribir. Así, una puntuación
inventada desde la consola del navegador no llega a ninguna parte.

Para que una partida entre en el TOP MUNDIAL:

- Los puntos tienen que ser **alcanzables** para el nivel al que se llegó, los
  fantasmas comidos y el tiempo jugado.
- El nombre tiene que ser **de verdad y publicable** (las mismas reglas de
  siempre, hasta 12 letras).
- Hay que jugar con **los ajustes de siempre**: con los fantasmas más lentos,
  Pac-Man más rápido, los energizantes más largos o más de tres vidas, la
  partida se juega igual, pero no entra en la clasificación mundial. Jugar
  con el juego más difícil sí cuenta.
- Y como antes, **cinco partidas por nombre y minuto** como mucho.

Si algo de eso falla, el panel de GAME OVER lo dice y la partida sigue su
curso: el historial local guarda todas, entren o no.

Para instalarlo en un proyecto nuevo, el orden importa: **primero** se
despliega la función y **después** se ejecuta
[`supabase/ranking-integridad.sql`](supabase/ranking-integridad.sql) (los
pasos exactos están en la cabecera del archivo). Al revés, el ranking se
queda un rato sin nadie que pueda escribir en él.

---

## 3. Para SPEC.md (técnico, en inglés)

> Goes in **Top mundial**, replacing the "Anti-spam y nombres" paragraph's
> parenthetical and the closing "Scores are client-submitted and therefore
> forgeable" sentence.

**Server-side validation** (`supabase/functions/enviar-record/index.ts`):
submissions no longer go to PostgREST. `Ranking.submit()` POSTs to
`/functions/v1/enviar-record` with the anon key (the gateway's default JWT
check is enough — the anon key *is* a JWT), and the function is the only
writer: `supabase/ranking-integridad.sql` revokes `insert` on `ranking` from
`anon`/`authenticated` and drops the public insert policy, leaving public
`select` untouched. The function inserts with `SUPABASE_SERVICE_ROLE_KEY`,
which bypasses RLS; both env vars are injected by Supabase, no secrets to
create.

Payload: `{ jugadores, modo, nombre1, nombre2, puntos, nivel, nivelInicio,
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

## 4. Despliegue (los pasos, en orden)

**El orden importa.** Si se aplica el SQL antes de que la función esté
desplegada, el ranking se queda sin nadie que pueda escribir en él: `anon` ya
no puede y la función todavía no existe. La función aguanta el caso contrario
(si las columnas nuevas aún no existen, reintenta la inserción sin ellas), así
que el camino seguro es siempre función primero.

### 1) Desplegar la función

Desde la raíz del repositorio, con la [CLI de Supabase](https://supabase.com/docs/guides/cli)
instalada y la sesión iniciada (`supabase login`):

```bash
supabase functions deploy enviar-record --project-ref yghnwkifbmmhrpvtjjit
```

(Si el proyecto ya está enlazado con `supabase link`, basta con
`supabase functions deploy enviar-record`.)

No hay que crear ningún secreto: `SUPABASE_URL` y
`SUPABASE_SERVICE_ROLE_KEY` las inyecta Supabase sola. Tampoco hace falta
`--no-verify-jwt`: el juego manda la clave anónima, que es un JWT válido, y
dejar la comprobación puesta es una barrera de más contra los curiosos.

### 2) Probarla con curl

Con `ANON` = la clave anon/publishable del proyecto (la misma que hay en
`js/net-config.js`):

```bash
ANON='eyJ...'
URL='https://yghnwkifbmmhrpvtjjit.supabase.co/functions/v1/enviar-record'

# Partida creíble: tiene que contestar 200 {"ok":true,"verificado":false}
curl -i -X POST "$URL" \
  -H "Authorization: Bearer $ANON" \
  -H 'Content-Type: application/json' \
  -d '{"jugadores":1,"modo":"local","nombre1":"PRUEBA","puntos":1200,
       "nivel":1,"nivelInicio":1,"fantasmas":2,"tiempoMs":90000,
       "ajustes":{"velFantasmas":1,"velPac":1,"powerS":1,"vidas":3}}'

# La trampa de siempre: tiene que contestar 400 "PUNTUACIÓN IMPOSIBLE"
curl -i -X POST "$URL" \
  -H "Authorization: Bearer $ANON" \
  -H 'Content-Type: application/json' \
  -d '{"jugadores":1,"modo":"local","nombre1":"PRUEBA","puntos":999999,
       "nivel":1,"nivelInicio":1,"fantasmas":0,"tiempoMs":90000,
       "ajustes":{"velFantasmas":1,"velPac":1,"powerS":1,"vidas":3}}'

# Ajustes rebajados: 400 "AJUSTES NO ESTÁNDAR"
curl -i -X POST "$URL" \
  -H "Authorization: Bearer $ANON" \
  -H 'Content-Type: application/json' \
  -d '{"jugadores":1,"modo":"local","nombre1":"PRUEBA","puntos":1200,
       "nivel":1,"nivelInicio":1,"fantasmas":2,"tiempoMs":90000,
       "ajustes":{"velFantasmas":0.85,"velPac":1.05,"powerS":1.5,"vidas":5}}'
```

La fila de prueba que entre se borra luego con
`delete from public.ranking where nombre1 = 'PRUEBA';`.

### 3) Aplicar el SQL

Dashboard → SQL Editor → New query → pegar
`supabase/ranking-integridad.sql` → Run. Añade `repeticion` y `verificado`,
le quita el `insert` a `anon` y se lo deja dicho a `service_role`.

Comprobación rápida: `insert` ya no debería salir para `anon`.

```sql
select grantee, privilege_type
  from information_schema.role_table_grants
 where table_schema = 'public' and table_name = 'ranking'
 order by grantee, privilege_type;
```

### 4) Desplegar el juego

`git push` a `main` (auto-deploy a Vercel). El orden con el juego da igual: un
cliente nuevo contra una función que no está solo enseña
`TOP MUNDIAL: NO ESTÁ DISPONIBLE` en el panel de GAME OVER, y un cliente
viejo contra el SQL ya aplicado falla el `insert` en silencio, como cuando no
había tabla.

### 5) Limpieza opcional de lo que ya entró con trampa

Hay 41 filas de antes de todo esto. Este `select` enseña las que no habrían
pasado el techo de puntos del nivel al que dicen haber llegado (2600 de
pastillas + 12000 de fantasmas + 2 frutas por nivel, con el mismo 10% de
margen; se aproxima la fruta por su valor máximo, así que es una cota
conservadora y no señala de más):

```sql
select id, nombre1, nombre2, puntos, nivel, creado_en
  from public.ranking
 where puntos > (nivel * (2600 + 12000 + 2 * 5000)) * 1.1
 order by puntos desc;
```

Si el listado tiene sentido, el `delete` es el mismo `where`. Conviene
mirarlo a ojo antes: borrar la partida de alguien que jugó de verdad es peor
que dejar una trampa puesta.
