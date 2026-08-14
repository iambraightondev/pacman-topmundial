# Pendiente

Estado del proyecto y lo que queda por hacer, con las decisiones ya tomadas y
el porqué. La idea es que quien lo retome (aunque sea uno mismo dentro de tres
meses) no tenga que reconstruir el razonamiento.

Lo que YA está hecho vive en [`CHANGELOG.md`](CHANGELOG.md) (qué cambió, en
cristiano) y en [`SPEC.md`](SPEC.md) (cómo funciona por dentro).

Última puesta al día: **14 de agosto de 2026**.

---

## Lo del 14 de agosto: el modo HABILIDADES

Cuatro poderes en Q, W, E y R sobre el laberinto de siempre. Todo lo suyo
vive en `js/habilidades.js`; en el resto del juego solo quedan enganches.
El detalle está en [`SPEC.md`](SPEC.md) ("Modo HABILIDADES") y lo que se
juega, en [`CHANGELOG.md`](CHANGELOG.md).

**No necesita nada del servidor**: ni tabla, ni migración, ni Edge Function.
Se despliega subiendo los archivos y ya.

Tres decisiones que conviene no volver a discutir desde cero:

- **Fuera del top mundial, y también fuera del récord local.** Lo primero
  era evidente; lo segundo no tanto, y es lo que de verdad importaba: el
  récord de cada formato viaja a `perfiles.recordN` y de ahí salen las
  maestrías. Sin ese freno, una partida a mordiscos regalaba una insignia
  que dice otra cosa. Experiencia y logros sí cuentan.
- **Solo flechas para moverse.** La W era el "arriba" del J2 y de paso un
  atajo del J1. No hay tecla que haga dos cosas, así que en este modo WASD
  se apaga entero (dejar la A, la S y la D moviendo sería medio mando). De
  ahí sale que el modo **no esté** en dos jugadores en el mismo teclado.
- **Tampoco en PAC-MAN VS.** Morder de un toque a un fantasma que lleva una
  persona, sin que pueda hacer nada, no es una pelea.

### Los logros por modo (mismo día)

18 logros nuevos, tres por modo, en la misma lista de siempre. Lo que hay
que saber para tocarlos:

- **No se escribe ningún contador a mano.** Un logro con `modo` mira la clave
  `modo:stat`, y `Achievements.STATS` se monta al cargar a partir de
  `CFG.ACHIEVEMENTS`. Añadir un logro de un modo **crea su contador solo**, y
  solo se guarda lo que mire alguien: hoy no existe `clasico:fantasmas`
  porque ningún logro lo pide.
- **Una partida lleva varias etiquetas** (`Game.achTags`): el formato (`solo`
  o `party`) y el modo. Una party de habilidades cuenta para las dos. Los
  modos entre sí no se mezclan.
- Al añadir un logro de un modo, mirar **quién lo cuenta en online**. Es la
  trampa de esto: el anfitrión ejecuta también lo que le piden los invitados,
  y hay cosas que el invitado no llega a saber de sí mismo. Por eso las cazas
  de VS. se apuntan al cerrar la partida (desde el marcador, que sí viaja) y
  los mordiscos se apuntan en la máquina de quien pulsa la tecla.

> **Ojo con `persistHighScore()`**: se frenó para HABILIDADES, pero **las
> partidas de LABERINTOS sí siguen haciendo récord local** (y por tanto
> tocan `perfiles.recordN` y las maestrías), aunque el propio panel diga que
> ese modo no entra en el top mundial. Es de antes de esto y se dejó como
> estaba para no cambiar de callado un comportamiento que nadie pidió, pero
> huele a lo mismo que se acaba de arreglar aquí. Si se toca, es una línea.

---

## Lo que está aplicado en producción

Tampoco del 12 de agosto queda nada por desplegar: `supabase/reto.sql` se
ejecutó entero ese mismo día. El **hueco único por nombre y día** está puesto
(`reto_diario_un_intento_idx`), la política de inserción ya protege los
nombres con cuenta y el freno viejo de tres envíos está retirado. La tabla no
perdió ni una fila: no había duplicados que deduplicar.

Comprobado contra el servidor, con la clave anónima: el primer intento del día
entra (201), el segundo con el mismo nombre —aunque cambien las mayúsculas—
vuelve como **409**, firmar con el nombre de una cuenta ajena da **RLS
denegado** y un nombre sin cuenta sigue abierto. Las filas de esa comprobación
se borraron; en el reto solo están las marcas de verdad.

> Se coló una marca de prueba en el reto del 12 de agosto (`BRAI`, 1200) desde
> el arnés de `tests.html`, que corre con las credenciales buenas. Se borró, y
> el agujero está tapado: lo que envía va dentro de `sinRed()` (`js/tests.js`).
> Si alguna vez vuelve a aparecer una marca rara, mirar ahí primero.

El historial en la nube **no necesitaba nada del servidor**: lee la tabla
`ranking`, que ya estaba y ya era de lectura pública.

De lo del 6 de agosto tampoco quedó nada: se aplicó sobre la marcha.

| Qué | Estado |
|---|---|
| Juego (Vercel) | service worker `pm-v23` — **el modo HABILIDADES está sin desplegar** |
| `perfiles.record3` / `record4` (trío y escuadra) | aplicado |
| `ranking.nombre3` / `nombre4` + CHECK nuevos | aplicado |
| Vistas `ranking_top` y `ranking_temporada` | rehechas |
| Edge Function `enviar-record` | **versión 2** desplegada |
| `reto_diario`: un hueco por nombre y día | aplicado (12 de agosto) |

Dos avisos operativos:

- **`CFG.NET.PROTO` está en 7** (subió el 14 de agosto con HABILIDADES).
  Quien tenga una pestaña vieja abierta no podrá entrar en una party hasta
  recargar. Es lo normal al cambiar la forma de lo que viaja por red, pero
  conviene saberlo si alguien se queja.
- **Hay un token de Supabase que revocar, y sigue vivo.** En la sesión del 6
  de agosto se pegó un *personal access token* (`sbp_…`) en el chat para
  aplicar las migraciones. Da acceso a **toda la cuenta**, no a un proyecto, y
  se queda escrito en el historial local de la sesión
  (`~/.claude/projects/…/*.jsonl`), así que borrar el chat de la pantalla no
  lo borra. El 12 de agosto se usó otra vez desde ahí para aplicar `reto.sql`:
  funcionó, o sea que **no está revocado**. Cuando ya no haga falta:
  <https://supabase.com/dashboard/account/tokens> → borrarlo, y si hace falta
  otro, mejor por variable de entorno que pegado en el chat.

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
