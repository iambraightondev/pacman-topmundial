# Pendiente

Estado del proyecto y lo que queda por hacer, con las decisiones ya tomadas y
el porqué. La idea es que quien lo retome (aunque sea uno mismo dentro de tres
meses) no tenga que reconstruir el razonamiento.

Lo que YA está hecho vive en [`CHANGELOG.md`](CHANGELOG.md) (qué cambió, en
cristiano) y en [`SPEC.md`](SPEC.md) (cómo funciona por dentro).

Última puesta al día: **14 de agosto de 2026** (segunda tanda del día).

---

## Lo último: DESATADO, la Q en party y la portada nueva

Seis cosas, todas subidas. El qué está en [`CHANGELOG.md`](CHANGELOG.md) y el
cómo en [`SPEC.md`](SPEC.md); aquí solo lo que hay que saber **antes de tocar
esto**.

1. **HABILIDADES se llama ahora DESATADO.** Cambió el cartel y nada más:
   **todos los identificadores siguen siendo `hab`** (ajustes, repeticiones, lo
   que viaja por red, los contadores de logros y las rutas de maestría), y el
   archivo sigue siendo `js/habilidades.js`. Si algún día se renombra de
   verdad, hay que migrar localStorage y subir `CFG.NET.PROTO`; hoy no hace
   falta y por eso no se hizo.

2. **La Q en party ya no te mata.** El arreglo son dos piezas, y conviene no
   quitar ninguna sin entender la otra:
   - **El escudo** (`Hab.protegido`, `CFG.HAB.BITE_GUARD`): el invitado no
     mata fantasmas, así que tras pulsar la Q el fantasma sigue vivo y pegado
     —y el mordisco le acaba de girar la cara hacia él—, se metía dentro y
     moría por haber acertado. Ahora ese fantasma concreto no le hace nada
     durante 45 ticks. **`guestCollisions` lo salta ENTERO**, no solo la rama
     de morir: comérselo por las bravas mandaría un `ateGhost` además del
     mordisco y el anfitrión lo contaría dos veces.
   - **El margen de red** (`CFG.HAB.BITE_NET_MARGIN`): el anfitrión valida el
     mordisco que le piden con una casilla de más, porque la posición del
     invitado le llega a 12 Hz y sus fantasmas los mueve él. **No agranda el
     alcance**: el invitado solo dispara si en su pantalla estaba a `BITE_PX`.
   - Y el alcance base subió media casilla (`BITE_MARGIN` 4 → 8): son **dos
     casillas justas**.

3. **Doce rutas de maestría** (tres mundos por cuatro formatos).
   - `Game.recordsModo` es `{lab:[4], hab:[4]}`, indexado por jugadores−1.
   - **La clave de solo NO lleva sufijo** (`CFG.recordModoKey`), y eso es a
     propósito: lo que ya tuviera guardado alguien cae en su ruta de solo.
     Lo mismo en la nube (`record_lab` es la de solo; `record_lab2..4` son
     nuevas). Si se cambiara, todo el mundo perdería su maestría de ahí.
   - Los ids de ruta también se eligieron para no romper lo anunciado:
     `solo/duo/trio/escuadra` y `lab`/`hab` son los de antes.
   - `Account` lleva **dos banderas**: `sinModos` (las dos columnas viejas) y
     `sinModosFmt` (las seis nuevas). **El orden de comprobación importa**:
     `record_lab3` también casa con el patrón de `record_lab`, así que lo de
     formato se mira primero o se dejarían de guardar también las de solo.

4. **Portada en carrusel.** Las seis tarjetas siguen montándose todas a la vez
   —el icono es un lienzo y repintarlo a cada paso se vería— y se enseña la
   elegida con `display`, no con opacidad, para que las otras no se puedan
   pulsar ni las pille la navegación con flechas.

5. **La barra de Q/W/E/R vive dentro de `#stage`**, en el flujo. Eso cambia una
   regla vieja: **el escenario ya no mide exactamente el lienzo**. Si se añade
   algo anclado al FONDO del escenario, hay que subirlo con `--habH` (lo hace
   ya `#chatBox`). `fitCanvas()` le descuenta la altura al lienzo, así que
   encender el modo achica el laberinto un escalón. En táctil sigue flotando
   (`.fija`), donde la cruceta no la tapa.

6. **Tu color se elige en PERFIL.** `setColor` repinta el perfil entero cuando
   es el tuyo, porque tiñe el avatar de la cabecera y las skins.

### Lo que quedó fuera de esta tanda

Nada roto, pero apuntado:

- **El selector de modo sigue sin recordar tu elección** entre recargas. Con
  el carrusel molesta un poco más que con la rejilla (antes veías las seis).
- **Las habilidades siguen sin sonar**: el turbo y el flash son mudos.
- Las **notas de la portada** de LABERINTOS y DESATADO siguen diciendo
  "MAESTRÍAS PROPIAS" sin contar que ahora también se parten por formato.

---

## Lo del 14 de agosto (primera tanda), de un vistazo

Cuatro cosas, y **todas están ya en producción** (comprobado contra
<https://pacman-topmundial.vercel.app>: sirve `js/habilidades.js`, el service
worker es `pm-v23` y las seis rutas de maestría están arriba). El qué está en
[`CHANGELOG.md`](CHANGELOG.md) y el cómo en [`SPEC.md`](SPEC.md); aquí va solo
lo que hay que saber **antes de tocar nada de esto**.

1. **Modo HABILIDADES** — cuatro poderes en Q/W/E/R (`js/habilidades.js`).
2. **Logros por modo** — 18 nuevos, 33 en total, todos en la misma lista.
3. **Maestrías de LABERINTOS y HABILIDADES** — seis rutas en vez de cuatro.
4. **Portada nueva** — seis tarjetas de modo y un solo `JUGAR`.

### 1 · Modo HABILIDADES

Todo lo suyo vive en `js/habilidades.js`; en el resto del juego solo hay
enganches. **No necesita nada del servidor.**

Decisiones que conviene no volver a discutir desde cero:

- **Fuera del top mundial, y también fuera del récord de siempre.** Lo primero
  era evidente; lo segundo no tanto, y es lo que de verdad importaba: el
  récord viaja a `perfiles` y de ahí salen las maestrías.
- **Solo flechas para moverse.** La W era el "arriba" del J2 y un atajo del
  J1. No hay tecla que haga dos cosas, así que aquí WASD se apaga entero
  (dejar A/S/D moviendo sería medio mando). De ahí sale que el modo **no esté**
  en dos jugadores en el mismo teclado.
- **Tampoco en PAC-MAN VS.** Morder de un toque a un fantasma que lleva una
  persona, sin que pueda hacer nada, no es una pelea.
- **El alcance del mordisco se mide en PÍXELES, no en casillas.** Con casillas
  fallaba a cada rato: dos sprites pegados en pantalla pueden caer en casillas
  que no son vecinas. Si algún día se toca el alcance, que siga en píxeles.
- **La E salta hacia la última flecha pulsada**, no hacia donde mira Pac-Man.
  Sale gratis porque el motor ya lo guarda en `nextDir`.

### 2 · Logros por modo

- **No se escribe ningún contador a mano.** Un logro con `modo` mira la clave
  `modo:stat`, y `Achievements.STATS` se monta al cargar desde
  `CFG.ACHIEVEMENTS`. Añadir un logro **crea su contador solo**, y solo se
  guarda lo que mire alguien: hoy no existe `clasico:fantasmas` porque ningún
  logro lo pide.
- **Una partida lleva varias etiquetas** (`Game.achTags`): el formato (`solo`
  o `party`) y el modo. Una party de habilidades cuenta para las dos; los
  modos entre sí no se mezclan.
- Al añadir un logro de un modo, mirar **quién lo cuenta en online**. Es la
  trampa: el anfitrión ejecuta también lo que le piden los invitados, y hay
  cosas que el invitado no llega a saber de sí mismo. Por eso las cazas de VS.
  se apuntan al cerrar la partida (desde el marcador, que sí viaja) y los
  mordiscos en la máquina de quien pulsa la tecla.
- **`Achievements.sembrarModos()` reparte lo jugado ANTES de que esto
  existiera.** Los contadores por modo nacían a cero y quien llevaba cien
  partidas veía `0/50`. El clásico se lleva lo global y party solo si hay
  récord de dúo/trío/escuadra; de los demás no se inventa nada. Se hace una
  vez (bandera `m`) y otra al entrar en la cuenta. **Ojo si se toca**: si se
  repitiera en cada arranque, las partidas de party engordarían el contador de
  clásico para siempre.

### 3 · Maestrías de LABERINTOS y HABILIDADES

- El agujero que tapa: una partida en **otro laberinto escribía en
  `highScore1`**, el récord que viaja a la cuenta y del que salen las
  maestrías, así que un trazado más cómodo entregaba insignias del laberinto
  de 1980.
- **`Game.recordSlot()` es el interruptor**: devuelve `'hab'`, `'lab'` o
  `null` (formato). Lo usan `persistHighScore`, el HIGH SCORE de la partida y
  `badgeMode()`. Si algún día hay otro modo aparte, se añade ahí.
- **El modo manda sobre el formato**: una party de habilidades puntúa en `hab`.
- `hab` **pide el doble** en cada escalón (`Badges.mult`).
- **Lo que ya estaba en `record1` se queda.** No hay forma de saber qué parte
  vino de un laberinto alternativo.

### 4 · Portada con selector de modo

- **La lista está en `MODOS` (arriba de `js/ui.js`)**. Añadir un modo es una
  entrada ahí más su caso en `playPick()`; el icono, en `drawModeIcon`.
- **Tres modos arrancan y tres abren su panel** (laberintos, online y reto),
  porque necesitan que elijas algo antes de que haya partida.
- Las tarjetas son `<button>` a propósito: así entran solas en la navegación
  con flechas.
- **`refreshReto()` y `refreshOnlineBtn()` ya no tocan botones**: llaman a
  `refreshModePicker()`. Si vuelve un botón suelto, ojo con eso.
- La **maestría se celebra arriba y fuera del laberinto siempre**. El cartelón
  del centro (`drawBadgeBanner`) se borró: tapaba la partida cinco segundos
  justo cuando acabas de hacer tu mejor marca y estás a punto de perderla.

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
| Juego (Vercel) | desplegado, service worker `pm-v24` (14 de agosto) |
| `perfiles.record3` / `record4` (trío y escuadra) | aplicado |
| `perfiles.record_lab` / `record_hab` (maestrías de los modos aparte) | aplicado (14 de agosto) |
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

Hoy hay **215 pruebas**. `node pruebas-node.js` termina con **4 fallos** y eso
es lo esperado: son límites del DOM de mentira (miden píxeles reales y
`offsetParent`), no fallos del juego. Las mismas **pasan en `tests.html`**, que
es la batería buena; la de Node vale para la lógica.

Si alguien va a perseguirlas, que sea para arreglar el arnés, no el juego.

> Al servir `tests.html` para probar, **usa un puerto nuevo cada vez**. La
> caché del navegador te devuelve el `js/` anterior y acabas probando código
> viejo sin enterarte.

---

## Cabos sueltos de lo del 14 de agosto

Nada de esto rompe nada; son cosas que se quedaron a medias o sin hacer y que
conviene tener apuntadas antes de que se olviden.

- **Las habilidades no suenan.** `js/habilidades.js` no llama a `AudioSys` ni
  una vez. La Q suena porque reutiliza el "te has comido un fantasma" y la R
  porque el modo azul ya trae lo suyo, pero **el turbo y el flash son mudos**,
  que son justo los dos que no cambian el marcador. Es lo primero que le
  pediría a este modo: dos sonidos cortos en `AudioSys` y llamarlos desde
  `turbo()` y `flash()`.
- **El selector de modo no recuerda tu elección** entre recargas: siempre
  vuelve a CLÁSICO. Se guarda en `UI.modePick`, que es de la sesión. Meterlo
  en `PM.settings` es fácil, pero obliga a tocar `DEFAULT_SETTINGS` y su
  saneado, y por eso se dejó.
- **`hab`, `lab`, `reto` y `vs` empiezan sus logros a cero para todo el
  mundo**, y no tiene arreglo: de esos modos no hay ni rastro en los
  contadores viejos. Solo el clásico y party se pudieron sembrar.
- **HABILIDADES sigue sin estar en dos jugadores locales ni en PAC-MAN VS.**
  Fue una decisión (teclas y equilibrio), no un olvido, pero si alguna vez se
  quiere, lo local pide un segundo juego de teclas para el J2.
- **Los iconos de las tarjetas se dibujan en cada `buildMenu`**, que solo pasa
  una vez, así que da igual. Si algún día se rehace el menú a menudo, cachear.

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
  - Para probar una habilidad con el teclado hay que **colocar y pulsar en la
    misma llamada**: entre dos `evaluate` pasa casi un segundo de partida y
    los fantasmas ya no están donde los pusiste. Va bien despachar el evento
    a mano (`document.dispatchEvent(new KeyboardEvent('keydown', …))`), que
    sigue pasando por el `ui.js` de verdad.
  - Para una foto, **congelar de verdad**: `G.paused = true` mete el rótulo de
    PAUSA encima. Lo limpio es dejar el bucle pintando y anular la simulación
    (`G.step = function () {}`).

El arnés de red del 14 de agosto (dos mundos, party de habilidades) hacía 19
comprobaciones: que el invitado enseña los dientes al instante pero no mata él
solo, que el anfitrión ejecuta y reparte, y que el eco no se aplica dos veces.
Tampoco está en el repo, pero se rehace con lo de arriba.
