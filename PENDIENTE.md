# Pendiente

Estado del proyecto y lo que queda por hacer, con las decisiones ya tomadas y
el porqué. La idea es que quien lo retome (aunque sea uno mismo dentro de tres
meses) no tenga que reconstruir el razonamiento.

Lo que YA está hecho vive en [`CHANGELOG.md`](CHANGELOG.md) (qué cambió, en
cristiano) y en [`SPEC.md`](SPEC.md) (cómo funciona por dentro).

Última puesta al día: **15 de agosto de 2026** (segunda tanda del día).

---

## Por dónde iba esto (léase primero)

**Todo está subido y desplegado.** Nada a medias, nada sin commitear.

| Commit | Qué |
|---|---|
| (esta sesión) | Recuperar la cuenta, DESATADO de a dos y en VS., los poderes suenan y las repeticiones se comparten |
| `ca8ee5b` | El día correcto, el reto solo de hoy, los laberintos como manda el arcade y una dificultad que no puede mentir |
| `dce5685` | El DAILY: siete retos por semana, y ya no son un modo de juego |
| `5d7daec` | Seis laberintos, y cada uno con una idea distinta |
| `2b9c3c2` | DESATADO, la Q que ya no te mata en party y una portada que impone |

Service worker en **`pm-v28`**. **246 pruebas**: 0 fallos en `tests.html` y los
4 de siempre en Node (ver más abajo).

> **Lo del servidor YA está aplicado** (tablas, permisos y la función de
> recuperación, todo comprobado contra el proyecto de verdad). Lo que puede
> faltar es el `git push`, que es lo que despliega en Vercel: si el juego en
> producción no enseña el botón de CÓDIGO DE RECUPERACIÓN, es eso.

### Lo único que hay que hacer a mano

- **Todo el mundo que ya tuviera cuenta debería crearse su CÓDIGO DE
  RECUPERACIÓN** (PERFIL → CÓDIGO DE RECUPERACIÓN, se enseña una vez y se
  apunta). Los que ya existen no tienen ninguno, y hasta que no lo tengan
  siguen exactamente igual que antes: olvidar la contraseña = perder la cuenta.
  El panel del perfil se lo dice a quien no lo tiene.
- **Al amigo que tenía "NORMAL" con cinco vidas**: que abra OPCIONES →
  DIFICULTAD y pulse **NORMAL** una vez. El arreglo hace que el panel deje de
  mentir (ahora le dirá PERSONALIZADA, que es la verdad), pero **no le toca los
  números a nadie**: cambiarle los ajustes por nuestra cuenta era peor.

### Lo que quedó sin resolver

- **No se encontró CÓMO se le descuadraron los ajustes a esa persona.** Se
  descartaron el camino del online (`opts.cfg` no escribe en `PM.settings`), el
  de las repeticiones (`cfgDe` hace una copia) y el de la carga. Lo que sí se
  hizo fue reproducir el SÍNTOMA a mano y taparlo de raíz, así que el agujero
  está cerrado venga de donde venga. Si vuelve a pasar con la etiqueta
  deducida, entonces sí hay un escritor de `startLives` que no conocemos.

### Cabos sueltos, todos juntos

Ninguno rompe nada. Están explicados donde toca; esto es solo la lista:

- **PAC-MAN VS. en local no deja repetición.** Es a propósito desde hoy: el
  rumbo de quien lleva fantasma no pasa por `Game.setPacDir` —lo intercepta
  `Versus.steer` antes—, así que la repetición salía con la mitad de las
  órdenes y el fantasma humano se movía solo al verla. Antes se grababa igual
  y mentía; ahora directamente no se ofrece. Para arreglarlo de verdad habría
  que apuntar también el rumbo del fantasma como una entrada más.
- **`hab`, `lab` y `vs` empiezan sus logros a cero** para todo el mundo, y no
  tiene arreglo: de esos modos no hay rastro en los contadores viejos.
- **Los iconos de las tarjetas se dibujan en cada `buildMenu`**, que solo pasa
  una vez. Si algún día se rehace el menú a menudo, cachear.

---

## Lo del 15 de agosto (segunda tanda): la cuenta ya no se pierde y DESATADO se juega entre dos

Seis cosas, todas subidas. El qué está en [`CHANGELOG.md`](CHANGELOG.md) y el
cómo en [`SPEC.md`](SPEC.md); aquí solo lo que hay que saber **antes de tocar
esto**.

### 1 · Recuperar la contraseña (lo que era más urgente de la lista)

Era el único punto que **restaba** cada vez que pasaba: quien olvidaba la
contraseña perdía los cuatro récords, la experiencia, los logros y las doce
maestrías, sin vuelta atrás.

- **Se eligió el código de recuperación, no el correo real.** El correo obliga
  a pedir un dato que hoy no se pide y a tocar la configuración de auth del
  proyecto; el código resuelve el problema entero sin nada de eso. Si algún día
  se quiere el correo, esto no estorba: pueden convivir.
- **En el servidor solo vive la HUELLA** (`sha256('USUARIO:CODIGO')`), en la
  tabla `recuperacion`. Y **nadie puede leerla desde el navegador, ni su
  dueño**: el RLS filtra FILAS, no columnas, así que además hay permisos POR
  COLUMNA (`grant select (id, creado_en)`). El dueño puede saber *que* tiene
  código —para que PERFIL avise a quien no— pero nunca *cuál*.
- **Por eso `Account.nuevoCodigo` NO usa el upsert de PostgREST.**
  `resolution=merge-duplicates` es un `ON CONFLICT` por dentro y Postgres pide
  `SELECT` sobre la tabla entera, que es justo el permiso que no se da. Hace
  alta y, si ya había, cambia. Dos peticiones a cambio de que la llave de
  repuesto no salga del servidor.
- **La contraseña la cambia una Edge Function** (`recuperar`), porque Supabase
  Auth solo deja cambiarla con sesión abierta —lo que no tiene quien la ha
  olvidado— o con la API de administración, que pide la service role. Va con
  **`verify_jwt: false` a propósito**; lo que guarda la puerta es el código (80
  bits) más un freno de 10 intentos y 15 minutos de castigo.
- **Ojo con esto si algo falla:** hizo falta `grant select on public.perfiles
  to service_role`. `cuentas.sql` solo se lo daba a `anon` y `authenticated`, y
  sin eso la función no encuentra la cuenta por nombre y contesta SIEMPRE
  «usuario o código incorrectos», sin forma de adivinar por qué. Está dentro de
  `supabase/recuperacion.sql`.
- **Usuario que no existe, usuario sin código y código equivocado dan la MISMA
  respuesta.** Si no, esta puerta sería una lista de qué nombres tienen cuenta.
- **El código usado se repone**, no solo se quema: uno de un solo uso que no se
  repone deja al jugador sin red la próxima vez, que es el problema del que
  venimos. Si la reposición falla, la respuesta dice `ok` igual con un aviso —
  la contraseña YA se cambió y mentir en cualquiera de las dos direcciones es
  peor.

### 2 · DESATADO en dos jugadores locales

- **El problema era una sola tecla**: la W. El J2 se mueve con WASD y la W era
  el turbo. La solución es darle a cada uno **una fila entera en su mitad del
  teclado** (`CFG.HAB.KEYS_2P`): J1 con flechas y `N M , .`, J2 con WASD y
  `Z X C V`. En solo y en online **no cambia nada**: siguen siendo Q W E R.
- Las teclas se miran por `ev.key`, **no por posición física**: esas ocho
  existen igual en ANSI y en el teclado español.
- **La barra del HUD tiene ahora un grupo por jugador** (`.hab-grupo`), cada
  uno con sus teclas y la recarga de su dueño. `UI.habIdxDe(gi)` dice de quién
  es cada grupo: `gi` en dúo local y `Game.localIdx` en todo lo demás.
- **DESATADO pasó a abrir panel** en vez de arrancar de una, como LABERINTOS y
  ONLINE: hay que elegir cuántos juegan, y ese panel es además el único sitio
  donde están escritas las teclas, que ya no son las mismas.

### 3 · DESATADO en PAC-MAN VS.: el fantasma también tiene poderes

- **Lo que lo tenía prohibido era el equilibrio**, no las teclas: comerse de un
  mordisco a un fantasma que lleva una persona, sin que pueda hacer nada, no es
  una pelea. Así que **quien lleva fantasma tiene los suyos**
  (`CFG.HAB.LIST_G`): **EMBESTIDA** (x1.35 durante 4 s) y **ACECHO** (4 s
  translúcido y sin la marca encima).
- **Son dos y no cuatro a propósito**: un fantasma no come, no atraviesa muros
  y no asusta a nadie, solo persigue. Lo único que necesita es poder cerrar una
  distancia y poder desaparecer un momento.
- **La mitad que de verdad importa del ACECHO es quitar la marca.** Volverse
  translúcido con un triángulo blanco encima no esconde a nadie. Quien lo lleva
  sigue viendo la suya (0.55 de alfa contra 0.3): esconderse de uno mismo no es
  una habilidad.
- **`Hab.listaDe(G, idx)` se resuelve en cada llamada, nunca al empezar.**
  `Versus.setup()` corre DESPUÉS de `Hab.empezar()` en `Game.newGame`: cuando
  se montan las recargas todavía no se sabe quién lleva qué. Si algún día se
  cachea, el fantasma se queda con los poderes de Pac-Man.
- **La EMBESTIDA se aplica en `Ghost.speedPx` y DESPUÉS del tope**, igual que
  el turbo en `pacSpeedPx` y por lo mismo. Y el anfitrión tiene que anotarla
  aunque sea un poder «propio»: el fantasma lo simula él, y sin la velocidad
  buena el invitado adelanta a su propio fantasma y el resincronizado le da
  tirones toda la embestida.

### 4 · Los poderes suenan

- Cada uno tiene el suyo en `js/audio.js`, y **suenan solo los de quien juega
  en esta pantalla** (`mio()` en `habilidades.js`). En una party de cuatro, oír
  las dieciséis teclas de todo el mundo no informa de nada y tapa el waka.
- **El mordisco al aire suena DISTINTO al que acierta** (`playBiteMiss`).
  Fallar la puntería y tener la tecla en recarga se sentían exactamente igual.
- Los dos del fantasma van más graves a propósito: en una partida donde los dos
  bandos tienen teclas, la altura es lo único que dice de qué lado vino el
  sonido sin apartar la vista.

### 5 · Repeticiones por enlace, también las de online

- **Las locales ya cabían en la URL y ya tenían `Replay.enlace()`... pero no
  había botón en ninguna parte.** Ahora sí: `COMPARTIR`, al lado de `VER`.
- **Las de red no caben** (~12 KB por minuto), así que **se suben y el enlace
  lleva solo un código** (`?rn=A3K9XQ7M`, tabla `repeticiones`). Para quien lo
  recibe son lo mismo.
- **Se descartó otra vez reescribir el netcode** para que las de red también
  cupieran en la URL (intención de rumbo en vez de posiciones). El porqué sigue
  abajo, en la sección de descartados: se paga tocando el núcleo de lo único
  que hoy va bien.
- **El código se guarda en la ficha local** (`reg.rn`): darle a COMPARTIR dos
  veces devuelve el MISMO enlace, no una copia más en el servidor y dos enlaces
  de la misma partida rodando por el chat.
- La tabla es de **lectura e inserción públicas**, como el ranking antes de la
  Edge Function: aquí no hay nada que falsificar (una repetición inventada solo
  se engaña a sí misma, no da puntos ni maestrías). Lo que sí hay es un tope de
  tamaño y un freno de 20 inserciones por minuto, para que nadie la use de
  disco duro.

### 6 · Lo pequeño

- **El selector de modo se recuerda** (`PM.settings.modePick`, validado contra
  `CFG.MODE_IDS`). La lista de ids vive en `config.js` y no en `ui.js` porque
  el saneado de los ajustes tiene que poder validarla sin depender del orden de
  carga; hay una prueba que vigila que las dos listas no se separen.
- **El progreso del DAILY se borró una vez** (`CFG.DAILY.RESET`, campo `rv` en
  lo guardado): la semana, la racha y la mejor racha venían de cuando el modo
  contaba mal el día. **Los tres logros del DAILY no se tocaron**: viven en el
  almacén de logros y eso ya está ganado. Para volver a borrar, se cambia el
  texto de `CFG.DAILY.RESET`.
- **`reto_diario` y su vista `reto_top` están tiradas.** Se guardaron antes las
  tres marcas que tenían, por si alguna vez hacen falta: `IAMBRAIGHTON` 2150
  (5/8), `MAULIO` 15330 (6/8) y `MAULIO` 1770 (7/8).

---

## Lo del 15 de agosto: cuatro arreglos de cosas que se vieron jugando

1. **El DAILY iba en UTC y marcaba el día equivocado.** Un viernes a las 19:00
   en Perú ya ponía SÁBADO. El reto viejo iba en UTC porque tenía
   clasificación mundial; el DAILY **no manda nada a ningún sitio**, así que
   ahora va con la fecha local. Si alguna vez se le pone clasificación
   compartida, esto hay que volver a pensarlo entero.
2. **Se retiró la recuperación**: solo se puede cumplir el reto de hoy
   (`Daily.abierto(i)` es `i === diaSemana()`). Los siete se siguen VIENDO.
   La decisión de antes (recuperar hasta el domingo) está probada y descartada:
   convertía el reto diario en una lista semanal.
3. **Los laberintos rompían LA regla del original**: nunca dos filas de comida
   pegadas sin muro de por medio, o sea ni un cuadro 2×2 transitable. **Los
   seis están redibujados.** La regla y sus tres trampas (columna 1 abierta,
   el eje del espejo, filas 8 y 20 de pasillo entero) están explicadas en la
   cabecera de `js/mazes.js`, y hay una prueba que las vigila —también contra
   el laberinto de 1980, que es de donde sale la regla—.
4. **`difficultyPreset` era un rótulo guardado que nadie comprobaba**, y por
   eso el panel podía decir NORMAL con cinco vidas. Ahora **se deduce** de los
   valores (`presetDe` en `js/ui.js`). **Si se añade un ajuste a
   `CFG.PRESETS`, hay que añadirlo a `PRESET_KEYS`**, o dos dificultades
   distintas pasarían por la misma.

> Lo que **no** es un fallo: el marcador dibuja una vida MENOS de las que
> tienes, porque la que estás usando no se pinta. Es del arcade de 1980.

---

## Lo de antes: los laberintos y el DAILY

Dos cosas, las dos subidas.

**Seis laberintos, uno por idea.** Los tres viejos se REDIBUJARON (no se
renombraron), así que una repetición online guardada de ANILLOS, PANAL o
COLMILLOS ya no vale: el trazado de debajo es otro. `Mazes.conocido()` lo
detecta y la repetición se da por rota. Si algún día se rehace otro trazado,
hay que hacer lo mismo o cambiarle el id.

- Al dibujar uno nuevo, **la regla de las dos filas de comida manda**: nunca
  dos pegadas sin muro de por medio. De ahí salen las tres trampas, que están
  contadas en la cabecera de `js/mazes.js`: la columna 1 abierta casi
  siempre, el eje del espejo, y las filas 8 y 20 de pasillo entero (son las
  que enchufan cada mitad con los huecos de una casilla del núcleo; si se
  tapan, el callejón sale **en las filas copiadas**, que es donde menos se
  mira).
- El validador de las pruebas (`js/tests.js`) lo canta todo: cuadros de 2x2,
  callejones, pastillas inalcanzables, simetría, borde y energizantes.

**El DAILY sustituye al RETO DE HOY**, que era un modo de juego y por eso no
funcionaba: para jugarlo había que dejar de jugar a lo tuyo.

- **Se mide por el mismo embudo que los logros** (`Game.bumpAch` →
  `Daily.apunta`) y con el mismo vocabulario de contadores. Si se añade un
  contador nuevo a `Achievements.BASE`, sirve para un reto sin tocar nada
  más. **Ojo con el tipo**: los de `suma` se acumulan a lo largo del día y los
  de `mayor` se quedan con la mejor marca de UNA partida.
- **Los siete salen de la fecha de la semana**, no de un sorteo ni de un
  servidor. Si se toca `retosDe()`, la semana en curso cambia de retos a
  media semana para todo el mundo.
- **Cinco libres garantizados** (`LIBRES_POR_SEMANA`). Bajarlo deja semanas
  imposibles para quien juega solo; hay una prueba que lo vigila.
- **La racha cuenta días seguidos** y sobrevive al cambio de semana.
- Los tres logros conservan sus ids (`rt_*`) y `sembrarDaily()` los siembra
  con `reto:partidas`. Esa clave **ya no está en STATS**, así que se lee del
  almacén en crudo: si algún día se retira otro contador con logros detrás,
  este es el patrón.

> **La tabla `reto_diario` sigue en Supabase.** El juego ya no la toca, pero
> tiene marcas de verdad dentro y borrarla no es cosa de un refactor. Cuando
> se quiera:
> `drop view if exists public.reto_top; drop table if exists public.reto_diario;`

---

## Lo de antes del mismo día: DESATADO, la Q en party y la portada nueva

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

Las dos que se apuntaron aquí —que el selector de modo no recordaba la
elección y que las habilidades no sonaban— **están hechas** en la segunda
tanda del 15 de agosto, arriba.

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
| Juego (Vercel) | desplegado, service worker `pm-v28` (15 de agosto) |
| `recuperacion` + `grant select on perfiles to service_role` | aplicado y comprobado (15 de agosto) |
| Edge Function `recuperar` (`verify_jwt: false`) | desplegada y comprobada de punta a punta (15 de agosto) |
| `repeticiones` (enlaces de repetición online) | aplicada y comprobada (15 de agosto) |
| `reto_diario` y su vista `reto_top` | **TIRADAS** (15 de agosto) |
| `perfiles.record3` / `record4` (trío y escuadra) | aplicado |
| `perfiles.record_lab` / `record_hab` (maestrías de los modos aparte) | aplicado (14 de agosto) |
| `perfiles.record_lab2..4` y `record_hab2..4` (las doce rutas) | aplicado y comprobado (14 de agosto) |
| `ranking.nombre3` / `nombre4` + CHECK nuevos | aplicado |
| Vistas `ranking_top` y `ranking_temporada` | rehechas |
| Edge Function `enviar-record` | **versión 2** desplegada |
| `reto_diario`: un hueco por nombre y día | aplicado (12 de agosto), tabla ya tirada |

> `reto_diario` queda como historia: el RETO DE HOY se retiró el 14 de agosto,
> `supabase/reto.sql` ya no está en el repo y la tabla (con su vista
> `reto_top`) se tiró el 15. Sus tres marcas están apuntadas más arriba, en la
> segunda tanda del 15 de agosto.

Un aviso operativo:

- **`CFG.NET.PROTO` está en 7** (subió el 14 de agosto con HABILIDADES). Quien
  tenga una pestaña vieja abierta no podrá entrar en una party hasta recargar.
  Es lo normal al cambiar la forma de lo que viaja por red, pero conviene
  saberlo si alguien se queja. **No ha subido con los poderes del fantasma**:
  viajan por el `hab` que ya existía (`gevt`/`evt` con `k`), solo que ahora `k`
  puede ser de la otra lista, y quien no la conozca lo descarta sin romper
  nada.

> El *personal access token* de Supabase (`sbp_…`) que se pegó en el chat el 6
> de agosto **sigue vivo, y se ha usado en esta sesión** para aplicar el SQL y
> desplegar la función. Se decidió expresamente no revocarlo por ahora. Da
> acceso a toda la cuenta y está escrito en el historial local de la sesión
> (`~/.claude/projects/…/*.jsonl`), así que el día que se quiera cerrar:
> <https://supabase.com/dashboard/account/tokens>.

### Las cuatro pruebas que "fallan" en Node

Hoy hay **246 pruebas**. `node pruebas-node.js` termina con **4 fallos** y eso
es lo esperado: son límites del DOM de mentira (miden píxeles reales y
`offsetParent`), no fallos del juego. Las mismas **pasan en `tests.html`**, que
es la batería buena; la de Node vale para la lógica.

Si alguien va a perseguirlas, que sea para arreglar el arnés, no el juego. El
15 de agosto se arregló una pieza de ese arnés: el `style` de mentira no tenía
`setProperty`, y el juego lo usa de verdad para decirle al escenario cuánto
ocupa la barra de poderes (`--habH`). Eso ya no falla; las cuatro que quedan
miden píxeles dibujados y `offsetParent`, que es harina de otro costal.

> Al servir `tests.html` para probar, **usa un puerto nuevo cada vez**. La
> caché del navegador te devuelve el `js/` anterior y acabas probando código
> viejo sin enterarte.

---

## Cabos sueltos de lo del 14 de agosto (con el detalle)

La lista corta está arriba, en «Cabos sueltos, todos juntos». Aquí va el
porqué de cada uno, que es lo que hace falta para arreglarlos.

De los cinco que había aquí, **tres están hechos** (los sonidos, el selector
de modo y DESATADO en dúo local y en VS.: ver la segunda tanda del 15 de
agosto). Quedan los dos que no se arreglan solos:

- **`hab`, `lab` y `vs` empiezan sus logros a cero para todo el
  mundo**, y no tiene arreglo: de esos modos no hay ni rastro en los
  contadores viejos. Solo el clásico y party se pudieron sembrar.
- **Los iconos de las tarjetas se dibujan en cada `buildMenu`**, que solo pasa
  una vez, así que da igual. Si algún día se rehace el menú a menudo, cachear.

## Lo que queda, por orden de lo que yo haría

### 1. Que las repeticiones de PAC-MAN VS. en local se puedan grabar

Es el único cabo que se ha abierto hoy. El rumbo de quien lleva fantasma no
pasa por `Game.setPacDir` —lo intercepta `Versus.steer` antes de llegar a
`Replay.entrada`—, así que la repetición salía con la mitad de las órdenes y
al verla el fantasma humano se movía por su cuenta. Hasta hoy se grababa igual
y mentía; ahora `Replay.alEmpezar` se planta si `G.isVersus()`.

Para arreglarlo de verdad hay que **apuntar el rumbo del fantasma como una
entrada más**, con su jugador y su dirección, y reinyectarlo por `Versus.steer`
al reproducir. Es el mismo patrón que ya tienen los poderes (una entrada con su
tick), y no toca nada del netcode: es una repetición local. Lo que sí pide es
una letra nueva en el formato, y las libres quedan justas (ver el mapa de
letras en `js/replay.js`), así que probablemente toque subir `Replay.V`.

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

### 3. El netcode de intención de rumbo (descartado, y ya no urge)

Las repeticiones online **ya se comparten por enlace** desde el 15 de agosto,
pero por otro camino: se suben y el enlace lleva un código. Lo que sigue
descartado es lo que se planteaba antes para conseguirlo — que los invitados
manden **intención de rumbo** en vez de posiciones (como ya hace el fantasma de
PAC-MAN VS.) y que el anfitrión sea autoridad. Con eso la repetición volvería a
ser teclas, cabría entera en la URL y de paso el ranking ganaría integridad.

**Se descartó porque se paga tocando el núcleo de lo que hoy funciona bien**:
el invitado simula su propio Pac-Man en local y por eso no se nota lag.
Cambiarlo obliga a predicción y reconciliación, y hacerlo regular deja el
online peor que antes.

Ahora tiene todavía menos prisa: lo que lo pedía —compartir— ya está resuelto.
Si algún día se retoma será por la INTEGRIDAD del ranking, que es la otra mitad
del trato, y entonces conviene hacerlo junto con el punto 2.

---

## Ideas que harían crecer el juego

Sin orden de urgencia; ninguna es un arreglo.

- **Retos entre amigos.** Todas las piezas están, y desde el 15 de agosto
  también el botón: repeticiones deterministas que caben en una URL, botón de
  COMPARTIR, lista de amigos y canal personal para invitaciones. Mandar "supera
  esto" con tu partida dentro, y que al abrirla se juegue **la misma semilla**,
  es lo más pegajoso que se puede montar con lo que ya hay — y ahora es medio
  día de trabajo, no dos.
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
