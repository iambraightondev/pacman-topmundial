# Pendiente

Estado del proyecto y lo que queda por hacer, con las decisiones ya tomadas y
el porqué. La idea es que quien lo retome (aunque sea uno mismo dentro de tres
meses) no tenga que reconstruir el razonamiento.

Lo que YA está hecho vive en [`CHANGELOG.md`](CHANGELOG.md) (qué cambió, en
cristiano) y en [`SPEC.md`](SPEC.md) (cómo funciona por dentro).

Última puesta al día: **12 de agosto de 2026**.

---

## Lo que hay que aplicar (12 de agosto)

Lo del 12 de agosto —el intento único del reto y el historial en la nube— está
en el código pero **no en el servidor**. Falta una cosa, y hay que hacerla
antes de que el arreglo sirva de algo:

1. **Ejecutar [`supabase/reto.sql`](supabase/reto.sql)** entero (Dashboard →
   SQL Editor → New query → Run). Es lo que crea el hueco único por nombre y
   día; sin él, el juego pregunta y avisa, pero la tabla sigue admitiendo la
   segunda marca. Deja una fila por nombre y día (la mejor, que es la que la
   clasificación ya enseñaba) y retira el freno viejo de tres envíos.
2. **Antes, borrar una marca de prueba** que se coló en el reto del **12 de
   agosto**: `BRAI`, 1200 puntos, nivel 3. La metió una prueba nueva mientras
   se escribía esto (ya está tapado: el arnés corre sin red, ver `sinRed` en
   `js/tests.js`), pero si se queda, al ejecutar el SQL se convierte en TU
   marca de ese día y no habrá forma de mandar otra.

   ```sql
   delete from public.reto_diario
    where fecha = '2026-08-12' and upper(btrim(nombre)) = 'BRAI';
   ```

El historial en la nube **no necesita nada del servidor**: lee la tabla
`ranking`, que ya estaba y ya era de lectura pública.

## Lo que está aplicado en producción

De lo del 6 de agosto no quedó nada por desplegar: se aplicó sobre la marcha.

| Qué | Estado |
|---|---|
| Juego (Vercel) | desplegado, service worker `pm-v21` |
| `perfiles.record3` / `record4` (trío y escuadra) | aplicado |
| `ranking.nombre3` / `nombre4` + CHECK nuevos | aplicado |
| Vistas `ranking_top` y `ranking_temporada` | rehechas |
| Edge Function `enviar-record` | **versión 2** desplegada |
| `reto_diario`: un hueco por nombre y día | **pendiente** (arriba) |

Dos avisos operativos:

- **`CFG.NET.PROTO` está en 6.** Quien tenga una pestaña vieja abierta no
  podrá entrar en una party hasta recargar. Es lo normal al cambiar la forma
  de lo que viaja por red, pero conviene saberlo si alguien se queja.
- **Hay un token de Supabase que revocar.** En la sesión del 6 de agosto se
  pegó un *personal access token* (`sbp_…`) en el chat para aplicar las
  migraciones. Da acceso a **toda la cuenta**, no a un proyecto. Si no se ha
  hecho ya: <https://supabase.com/dashboard/account/tokens> → borrarlo.

### Las cuatro pruebas que "fallan" en Node

`node pruebas-node.js` termina con **4 fallos** y eso es lo esperado. Son
límites del DOM de mentira (miden píxeles reales y `offsetParent`), no fallos
del juego: las mismas pasan en `tests.html`. **La batería buena es la del
navegador**; la de Node vale para la lógica.

Si alguien va a perseguirlas, que sea para arreglar el arnés, no el juego.

---

## Lo que queda, por orden de lo que yo haría

### 1. Recuperar la contraseña (lo más urgente)

**Hoy, quien olvide su contraseña pierde la cuenta.** No hay camino de vuelta:
el correo se compone por dentro (`usuario@cuentas.pacman-topmundial.vercel.app`),
ese buzón no existe y en `js/account.js` no hay ni un `reset`. Se pierden los
cuatro récords, la experiencia, los logros y las maestrías.

Es el único punto de esta lista que **resta** cada vez que pasa, y no tiene
arreglo a posteriori.

Dos caminos, de menos a más:

- **Código de recuperación**: se enseña una vez al registrarse, se guarda
  hasheado en `perfiles` y sirve para reponer la contraseña. Todo dentro de lo
  que ya hay.
- **Correo real opcional** en el perfil, y usar el *recovery* de Supabase.
  Más cómodo para el jugador, pero obliga a tocar la configuración de auth
  del proyecto y a pedir un dato que hoy no se pide.

### 2. Verificar las repeticiones DE VERDAD (descartado por ahora)

El portero (`supabase/functions/enviar-record`) comprueba que la repetición
*cuadre* con lo que se envía, pero no la rejuega con el motor. Rejugarla es lo
único que convertiría el `verificado` en una garantía.

**Se descartó a conciencia el 6 de agosto**, y conviene no volver a empezar de
cero el razonamiento:

- Obliga a **portar el motor a Deno** (las tablas de `config.js`, `pacman.js`,
  `ghost.js` y el bucle de `game.js`). Es factible —el motor es determinista y
  autocontenido— pero es el trabajo más grande de la lista.
- Y crea un acoplamiento permanente: hoy ya hay que tocar dos sitios cuando
  cambia una tabla de puntuación; esto lo multiplica.
- Lo que protege es un tablero de cinco amigos donde el portero **ya** corta lo
  burdo (techos de puntos, suelos de tiempo, ajustes no estándar).
- Y su fallo típico —**rechazar una partida legítima**— es peor para el
  jugador que el problema que resuelve.

Cuándo retomarlo: si el tablero crece y aparece alguien inventándose marcas
*plausibles* (las burdas ya no entran). Entonces, con el port en serio.

> `supabase/functions/enviar-record/index.ts` menciona un
> `docs-pendientes/integridad-ranking.md` que no existe. Es esta sección.

### 3. Repeticiones online por enlace (descartado por ahora)

Las de red ya se graban y se ven (desde el 6 de agosto), pero **no caben en
una URL**: son ~26 KB por minuto de partida frente a los cientos de bytes de
una local.

Para que se compartieran por enlace habría que cambiar el netcode: que los
invitados manden **intención de rumbo** en vez de posiciones (como ya hace el
fantasma de PAC-MAN VS.) y que el anfitrión sea autoridad. Entonces valdría el
formato de teclas de siempre, con enlace y todo, y de paso el ranking ganaría
integridad.

**Se descartó porque se paga tocando el núcleo de lo que hoy funciona bien**:
el invitado simula su propio Pac-Man en local y por eso no se nota lag.
Cambiarlo obliga a predicción y reconciliación, y hacerlo regular deja el
online peor que antes. No compensa por una función secundaria.

---

## Ideas que harían crecer el juego

Sin orden de urgencia; ninguna es un arreglo.

- **Retos entre amigos.** Todas las piezas están: repeticiones deterministas
  que caben en una URL, lista de amigos y canal personal para invitaciones.
  Mandar "supera esto" con tu partida dentro, y que al abrirla se juegue **la
  misma semilla**, es lo más pegajoso que se puede montar con lo que ya hay.
- **Torneo en la party**: al mejor de N rondas con marcador acumulado y podio.
  Convierte media hora suelta en un evento.
- **Editor de laberintos**: ya hay `js/mazes.js` y compresión en URL. Con
  validación de que el trazado se puede recorrer, el juego tiene contenido
  infinito sin tocar el laberinto de 1980.
- **Inglés.** Hoy todo el texto está a fuego en español. Un `CFG.TEXTOS` con
  dos idiomas multiplica el público de un juego que ya está terminado.
- **Daltonismo**: los cuatro fantasmas se distinguen solo por color (y en modo
  asustado, solo por azul). Un patrón o una inicial dentro del sprite lo
  arregla sin afear nada.
- **Temporadas con premio**: hoy el mes cambia solo y ya está. Un podio al
  cerrar y una insignia de temporada dan motivo para volver el día 1.
- **Modo práctica**: un nivel que no cuenta para nada, con los patrones
  clásicos marcados. Es lo que hace que alguien pase de 5.000 a 20.000 puntos.

---

## Cómo se probó todo esto (por si ayuda)

Además de `tests.html` y `pruebas-node.js`, en la sesión del 5 y 6 de agosto
se montaron arneses de usar y tirar que valieron su peso en oro. No están en
el repo, pero la técnica se rehace en diez minutos:

- **Varios "navegadores" en el mismo Node.** `pruebas-node.js` monta el juego
  entero en un sandbox; cargándolo N veces se tienen N mundos independientes.
  Cableando el `PM.Net.gameSend` de uno a la cola de red de los otros se juega
  una party de cuatro de verdad, con retardo simulado si hace falta. Así se
  comprobaron el fantasma humano por red, la sincronía anfitrión/invitado y la
  repetición online.
  - **Ojo con el orden de entrega**: si los mensajes se entregan al revés, se
    ven divergencias que no existen. Costó un rato de investigación.
- **Playwright** para el juego de verdad en Chromium: teclas reales, la
  batería de `tests.html` con lienzo de verdad y capturas de los paneles.
