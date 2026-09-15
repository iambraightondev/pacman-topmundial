# Pendiente

Estado del proyecto y lo que queda por hacer, con las decisiones ya tomadas y
el porqué. La idea es que quien lo retome (aunque sea uno mismo dentro de tres
meses) no tenga que reconstruir el razonamiento.

Lo que YA está hecho vive en [`CHANGELOG.md`](CHANGELOG.md) (qué cambió, en
cristiano) y en [`SPEC.md`](SPEC.md) (cómo funciona por dentro).

Última puesta al día: **15 de septiembre de 2026**.

---

## POR DÓNDE SEGUIR (lo primero de mañana)

**15 sep (tarde) — selector de modo con vecinos (`pm-v53`).** Braighton
pidió que donde estaban las flechas ◀ ▶ se vieran los modos adyacentes, "tipo
arcade". Ahora asoman el anterior y el siguiente (icono y nombre, apagados; se
encienden al pasar por encima) y la tarjeta entra deslizándose.

**15 sep (noche) — cruce de aspectos (`pm-v60`).** Braighton pidió que todo
combine con todo. Los efectos ya iban con cualquier skin; lo que faltaba eran
los accesorios en las 26 extravagantes. Ahora cada una tiene su cabeza
apuntada en `CABEZAS` (ojo, escala, coronilla, cuello) y cada accesorio va a
su zona. Ajustado a ojo con hojas de las 26 con los 11 accesorios.
**Límites conocidos:** el accesorio no sigue el meneo ni la mandíbula propios
de cada skin, y en cabezas pequeñas (tiburón, llama, bicéfalo) se ve pequeño a
tamaño de partida. **Si se crea una extravagante nueva, hay que darle su
entrada en `CABEZAS`** o no llevará accesorio. `tests.html` 327/327.

**15 sep (noche) — vestuario, segunda vuelta (`pm-v59`).** Tras verlo,
Braighton pidió tres cosas y están hechas: mandíbula del TIBURÓN más fina
(ahora el interior de la boca sigue a la mandíbula al abrirse), la pestaña
COLOR en fichas con la skin pintada y "A TU GUSTO", y clasificar las skins
por cómo se consiguen (filtros con contador; TODAS agrupada con títulos).
`tests.html` 327/327.

**15 sep (noche) — el VESTUARIO (`pm-v58`).** Braighton: lo del personaje
estaba repartido (PERFIL, SKINS, TIENDA) y todo salía mezclado, lo tuyo y lo
que no. Se le dio un plan y lo aprobó tal cual. Hecho: panel VESTUARIO en el
cuartel (sustituye a SKINS), solo lo tuyo con "VER LO QUE ME FALTA", pulsar
pone y lo ajeno se prueba en el maniquí, NUEVO con contador, TIENDA solo de
compra con PONÉRTELO, PERFIL con miniatura. Detalle en SPEC (*VESTUARIO*).
`tests.html` 325/325. **Node: ahora fallan 2**, no 4 (se arregló su DOM de
mentira, que no arrancaba desde la cartilla del DAILY por `createTextNode`).
**Por mirar jugando**: el vestuario en un móvil de verdad (el maniquí va
arriba y es alto), y si los NUEVO se entienden.

**15 sep (tarde) — la intro ya no suena en pausa (`pm-v56`).** Bug avisado
por Braighton: la melodía de inicio seguía al pausar o salir. Se programaba
entera de golpe y no había cómo pararla; ahora va por su propio volumen
(`AudioSys.stopIntro`) y `Game.stopIntro` la corta en `setPaused(true)`,
`votePause`, `surrenderNow` y `toMenu`. **Ojo:** NO va en `stopAllLoops`,
porque `enterReady` la llama justo después de lanzar la intro y la dejaría
muda (hay prueba de eso). `tests.html` 323/323.

**15 sep (tarde) — cuentas y arrastre de modos (`pm-v55`).**

- **Cuenta SANDROPEPAS BORRADA** a petición de Braighton ("ya no será usada"):
  usuario de Auth y su perfil (cascada). No tenía marcas, repeticiones ni
  amigos. Se hizo con la API de administración de Auth.
- **SANDROPEPA tiene ahora la contraseña `SANDROPEPA`**, puesta por Braighton.
  Comprobado entrando por la función `cuenta` como lo hace el juego.
- **Los modos se arrastran** (ratón o dedo; `UI.activarArrastreModos`) y el
  cambio es una cinta: sale la vieja y entra la nueva a la vez
  (`UI.animarCambioModo`, Web Animations, respeta "reducir movimiento").
  Soltar tras arrastrar no dispara el clic de JUGAR. `tests.html` 322/322.

**15 sep (tarde) — REGALO DE VETERANO (`pm-v54`).** Pidió sumar monedas a
quien más ha jugado y más logros tiene. Se le dieron tres opciones en tablas
con las 6 cuentas reales y **eligió la A** (5 por partida + 50 por logro, sin
tope), no la B recomendada (tope de 200 partidas). Tampoco pidió los 50 por
logro nuevo en adelante, así que **no se hizo**: es un regalo único. Queda:
IAMBRAIGHTON 4.930, MAULIO 1.300, SANDROPEPA 890, FREDDY 710, PIEROSENSUAL
690, SANDROPEPAS 355. Detalle en SPEC (*Veteran gift*). `tests.html` 322/322.
**Aviso dado:** con la A, IAMBRAIGHTON puede comprar tres skins de tienda de
golpe.

**15 sep (tarde) — el DAILY es LA CARTILLA (`pm-v51`).** Braighton pidió
rediseñarlo porque "no dan ganas"; se le enseñaron tres propuestas (El
Pasillo, La Marquesina, La Cartilla) en
<https://claude.ai/artifact/BzVPosraiSy9EooGJiiMri> y eligió **La Cartilla**.
Siete casillas con un fantasma por día, sello CAZADO, cuenta atrás hasta
medianoche en la portada y botín de 290 monedas por dentro. Solo cambia la
interfaz: la lógica del DAILY y lo guardado no se tocan. Detalle en SPEC
(*LA CARTILLA*). `tests.html` 320/320. **Descartadas**: El Pasillo (la más
cara de dibujar) y La Marquesina (informa bien, pero emociona poco).
**Por mirar jugando**: que el recuadro no empuje JUGAR fuera en pantallas
bajas, y un día perdido (en gris), que no se pudo ver un martes.
`pm-v52`: la cartilla por dentro, más grande (Braighton no la leía bien):
casillas más anchas, fantasmas de 70 px y textos de 13–16 px.

**15 sep (madrugada) — cierre de sesión, TODO SUBIDO (`pm-v50`).** Después de
la tienda salieron dos cosas más, las dos en producción:

- `pm-v49`: vistas previas de SKINS y TIENDA sincronizadas (todas a la vez).
  También en la vitrina del artifact.
- `pm-v50`: **repeticiones de DESATADO con la Q armada**. La de 93.870 de
  Braighton se veía morir al minuto; ahora se recompone al abrirla y cuadra
  (93.870 y 124 fantasmas). Detalle en SPEC (*The armed Q*). **Por confirmar**
  que Braighton la vio bien en su navegador (juega en **Arc**; las
  repeticiones viven en su localStorage, no en la nube).
- Cómo se depuró, por si vuelve a hacer falta: se copió el LevelDB del
  localStorage de Arc (`%LOCALAPPDATA%\Packages\TheBrowserCompany.Arc_…\LocalCache\Local\Arc\User Data\Default\Local Storage\leveldb`)
  y se leyó con un lector propio (tablas `.ldb` con snappy y el `.log`); la
  repetición se simuló en el juego servido en local.
- Tests: `tests.html` 320/320; Node, los 4 de siempre.

**15 sep — TIENDA y 15 skins nuevas, SUBIDO (`pm-v48`, protocolo de red 9).**
Braighton aprobó todo lo de la vitrina y pidió lanzarlo. Qué hay y qué mirar:

- **Tienda con monedas** (sin dinero real): 1.500 iniciales; 5 por partida
  de al menos un minuto + 1 por cada 1.000 puntos (tope 40); 20 por reto del
  DAILY y 150 por semana. Emotes 150, efectos 250, accesorios 450, skins de
  tienda 1.500. **Decisión mía, por avisar:** los 5 de la partida solo si dura
  un minuto; si no, reiniciar sin jugar era la forma más rápida de ganar.
- **No hay tabla nueva en Supabase**: lo ganado y lo comprado son contadores
  de logros (`monedas`, `c_<id>`) y el saldo se calcula. Detalle en SPEC
  (*TIENDA*).
- **La Q de las skins nuevas solo sale si acierta**, como se decidió para
  DRAGÓN, COFRE y OVNI.
- **HOMBRE LOBO**: luna llena calculada por ciclo medio (sin servidor), de
  noche. La próxima, hacia el 26 de septiembre.
- **Por mirar jugando**: que los efectos no molesten en partidas de cuatro,
  que el accesorio se lea a tamaño real, y el equilibrio de precios (con 1.500
  iniciales se compra una skin de tienda el primer día: aviso ya dado).
- Pruebas: `tests.html` 319/319 con el almacenamiento limpio; Node, los 4 de
  siempre.

**14 sep (noche) — producción en `pm-v47`.** Dos arreglos online, subidos:

- `pm-v46`: la skin (y el color y el nombre) cambiada con la party abierta
  llega a la partida. El líder no refrescaba nunca su propia fila.
- `pm-v47`: **reconexión automática** del transporte de Realtime. Se probó
  contra el servidor de verdad con cortes provocados (brusco, 3 s sin red,
  socket sordo y red caída del todo): vuelve sola, lo enviado durante el
  corte sale al volver, el socket sordo se repara en ~4 s (el juego pide un
  latido de comprobación al empezar un silencio) y solo se rinde a los 10 s.
  `DROP_TICKS` pasó de 480 a 600 para cuadrar con eso. **Por confirmar
  jugando** con el compañero: el corte que se veía "a cada rato" no se pudo
  reproducir (servidor estable 4 min, sin excepciones en partidas simuladas),
  así que la hipótesis es un bajón de red de uno de los dos.

**(Ya aprobado y subido el 15 sep; se deja por el historial.) Lo que estaba
pendiente de aprobación en la vitrina**
(<https://claude.ai/code/artifact/20184d7f-a037-40fb-913d-feb53f81ef27>):
las 10 extravagantes nuevas (por logro; HOMBRE LOBO por luna llena) y la
tienda: 1.500 monedas iniciales para todos, 5 + 1 por cada 1.000 puntos (máx.
40) por partida, 20 por reto del DAILY y 150 por semana; emotes 150, efectos
250, accesorios 450 (solo con skins de forma de Pac-Man), skins de tienda
1.500 (CUY y LLAMA, sin diseñar). Se lleva a la vez una skin, un accesorio,
un efecto y seis emotes. Las de nivel y logro no se venden. Aviso dado: con
1.500 iniciales cualquiera compra una skin de tienda el primer día.

**Lo de antes el 14 sep, TODO SUBIDO (`pm-v45`).** Tres tandas sobre las skins,
cada una pedida y aprobada por Braighton tras probarlas jugando:

- `pm-v43`: al morir se anima la skin (no el Pac-Man clásico); sonido propio
  al comer para las 11 extravagantes y DORADO; la Q propia de DRAGÓN (fuego),
  COFRE (monedas) y OVNI (rayo); mandíbula del TIBURÓN; hueco a la derecha
  en la vitrina; miniatura de RASTRO con estela.
- `pm-v44`: esos tres golpes solo si la Q **acierta** (`st.mordio`); humo del
  dragón animado (y resoplido si falla); bufido grave del dragón (el de sierra
  cansaba); en DESATADO el personaje ya no desaparece al morder (el parón
  arcade de los puntos lo escondía); los discos de RASTRO vuelven a la vitrina
  (el reloj era `Date.now()` en segundos y los arcos perdían precisión).
- `pm-v45`: el COFRE suelta 26 monedas (antes 8), con brillo y destellos,
  naciendo fuera del cofre.

Pruebas: `tests.html` 307/307 con el almacenamiento limpio; `pruebas-node.js`
los 4 de siempre.

**Cabos sueltos:**
- Una segunda vuelta seguida de `tests.html` falla en 2 (maestría ya
  celebrada, skin anunciada una vez): arrastran estado guardado de la vuelta
  anterior. No es del juego; se arregla limpiando ese estado al empezar.
- Braighton sigue probando skins jugando: esperar más ajustes de detalle.

**EN STANDBY (14 sep): cobrar por el juego obliga a cambiarle la cara.**
Braighton preguntó si publicar el juego le traería una demanda. Se investigó y
se dejó aparcado a petición suya; **no se ha tocado nada del juego**.

- **Lo que se concluyó:** tal cual está, es copia —usa la marca PAC-MAN, el
  personaje, los cuatro fantasmas con nombres y colores, y el laberinto de
  1980—, y el aviso de «no afiliado» no protege. Precedentes: *Atari v. Philips*
  (1982, *K.C. Munchkin* retirado por «aspecto y sensación» aun cambiando
  colores y detalles) y *Tetris v. Xio* (2012). Bandai Namco **demanda a quien
  vende** (Philips, AtGames 2019) y a los gratuitos les manda **retirada**
  (Scratch y Android, 2010); desde el escándalo de Scratch no se le conocen
  acciones contra aficionados. En Perú, INDECOPI multa hasta 180 UIT.
- **Riesgo real hoy:** gratis y entre amigos, casi nulo; lo peor sería que
  Vercel tumbe la web tras un aviso. **Con cobro, anuncios o tiendas de apps
  hay que cambiar la identidad**, también las skins con forma de Pac-Man. Las
  extravagantes, los modos, las maestrías y las cuentas son suyos y se quedan.
- **Nueve identidades propuestas**, con escena dibujada, enemigos, paleta y
  búsqueda rápida del nombre, en
  <https://claude.ai/code/artifact/ac42b27b-bfbb-4ac3-a27f-0883ea54f807>.
  Lejos del original: TRAGALUZ (recomendada: criatura que come luz contra
  «apagones»), ARCÓN (choca con un juego online ARCON Conquer), OVNÍVORO,
  GARABATO (hay un juego de mesa GARABATOS), CUYAZO (flojo fuera de Perú) y
  TORNASOL. Cerca del original, a petición expresa: COMETÓN (recomendada de
  esa tanda), POLVORÍN y BOCÓN (el límite: es el caso *K.C. Munchkin*).
- **La línea, aunque se quiera cerca:** fuera el disco amarillo sin cara con
  boca en cuña, los fantasmas de sábana con faldón, el cuarteto rojo/rosa/
  cian/naranja, los muros azules, el laberinto de 1980, cualquier «Pac» y
  también COMECOCOS (el nombre de Pac-Man en España). Se pueden quedar el
  fondo negro, el neón, puntos y pastillas, un protagonista redondo que come y
  cuatro perseguidores con personalidades.
- **Si se retoma, en este orden:** elegir identidad → buscar el nombre en
  INDECOPI (y EE. UU./Europa si se vende fuera) → registrar marca (clases 9 y
  41) y dominio → decidir qué pasa con los récords del laberinto de 1980
  (propuesta: histórico, no se borran) → cambiar el juego → recién ahí cobrar.
- Descartados al buscar nombre: LENGÜETAZO (juego de mesa y ataque de
  Pokémon) y PELUSÍN (personaje de una app infantil; hay un juego PELUSITA).

**Skins nuevas — SUBIDAS (13 de septiembre).**
Las 26 del diseño están en el juego (`js/skins.js`, service worker `pm-v42`),
con la vitrina de SKINS dentro del juego. `tests.html`: 0 fallos en Chromium;
`pruebas-node.js`: los 4 de siempre. Braighton dio el visto bueno con las
cifras de la tabla de abajo tal cual.
Detalle en CHANGELOG y SPEC (*Skins, emotes...*). Lo que hay que saber:

- **Cifras de logro puestas con datos reales** (contadores de `perfiles.logros`
  el 13 sep), no confirmadas una a una: CEREZA 120 frutas · MEDIO FANTASMA 10
  cazas en CACERÍA (no hay ruta de maestría de CACERÍA) · CORONA LEYENDA en
  clásico solo · ESCUADRA MAESTRO en escuadra de cualquier mundo · DORADO top
  10 · HAMBURGUESA 100 partidas · GATO 30 `party:partidas` (ese contador está
  sembrado de más: J1 lo tiene igual que el total) · TIBURÓN 300 fantasmas ·
  PLANTA 50 mordiscos · ROBOT 5 `dailyOk` (`dailyRacha` es la racha actual, no
  la mejor) · T-REX `nivelMax` 7 · OVNI 5 `caza:partidas` · COFRE 100.000 ·
  DRAGÓN MAESTRO en DESATADO solo · CALAVERA 250 muertes. Cambiar una es tocar
  `CFG.SKINS[].pide`.
- **DORADO se queda aunque te adelanten** (como todo: lo puesto no se quita).
  Hoy no filtra: los cinco con cuenta están en el top 7 por nombre.
- Diseño aprobado en la vitrina
  <https://claude.ai/code/artifact/20184d7f-a037-40fb-913d-feb53f81ef27>; lo
  de abajo es lo decidido allí.

- **Por nivel** (ordenables): MOÑITO, COMETA, HOLOGRAMA, GLITCH, FUEGO, RASTRO
  (estilo moto de luz; no se llama TRON porque es marca de Disney), PRISMA. **Por
  logro** (no dependen del nivel): CORONA, DORADO, MEDIO FANTASMA, CALAVERA,
  CEREZA, ESCUADRA. **De temporada**: CALABAZA y NOCHE DE BRUJAS (24–31 oct),
  CLAUS-MAN (20 dic – 6 ene).
- **CALAVERA: 250 muertes acumuladas** (elegido por Braighton; yo proponía 150).
  El juego no cuenta muertes: se siembra con `logros.partidas × 2,5` (a la baja:
  no descuenta abandonos, CACERÍA ni vidas compartidas). Con eso J1 y J3 (justo
  en 250) la tienen al salir y a los demás les faltan 52–78 partidas; 250 ≈ 100
  partidas desde cero, lo mismo que el nivel 15. Descartados: 100 (casi todos la
  tienen el primer día), 150 (se quedaba corto) y 500 (solo uno).
  La CALAVERA es la única que deja la forma de Pac-Man: mandíbula que se abre
  al comer y gira entera en vertical.
- **Escalera de niveles (A, la que se implementó):** 1, 2, 4, 6, 8, 10, 12,
  15, 18, 22, 26, 30, 34 en vez de 1/3/7/12/20/30, con el orden que Braighton
  dejó en la vitrina: CLÁSICO, SOMBRA, OJOS, MOÑITO, COMETA, NEÓN, HOLOGRAMA,
  GLITCH, PRISMA, PÍXEL, ARO, RASTRO, FUEGO. Solo un jugador pasaba del 30. La
  alternativa B (abaratar la experiencia a la mitad) se desaconsejó.
- **Extravagantes** (dejan la forma de Pac-Man; el comer es su propio gesto):
  CALAVERA, TIBURÓN, COFRE MÍMICO, DRAGÓN, PLANTA CARNÍVORA, ROBOT, T-REX,
  HAMBURGUESA, OVNI, GATO (todas por logro) y VAMPIRO (Halloween). Contadores
  propuestos, cifras sin decidir: fantasmas, puntosMax 100.000, maestría de
  DESATADO, mordiscos (no frutas: ya las pide CEREZA), racha del DAILY,
  nivelMax, partidas, cazas y partidas en equipo. Aviso dado: cuanto menos
  se parecen a Pac-Man, peor se lee hacia dónde van en una partida rápida.
- **Estelas proporcionales a la velocidad** (pedido expreso): SOMBRA, COMETA,
  RASTRO y las llamas de FUEGO se alargan con la velocidad de Pac-Man (turbo,
  ajustes, nivel). Implementado con la huella real de cada Pac-Man y su
  velocidad suavizada: la estela dobla esquinas y crece el doble de lo que
  sube la velocidad.
- **Las extravagantes no llevan la sierra blanca de la Q**: flotaría fuera de
  su cara. Con la Q activa abren la boca del todo; es su aviso.

**La sesión del 12 de septiembre (noche) está cerrada, subida y desplegada**
(service worker `pm-v41`). Dos cosas:

**1 · Las maestrías de equipo ya no piden x2 / x3 / x4, sino x1,25 / x1,5 /
x1,75** (`FORMATOS[].mult` en `js/badges.js`), en los tres mundos. Se decidió
**con las marcas reales** de `perfiles`, no a ojo:

| Ruta | Mejor marca | Antes | Ahora |
|---|---|---|---|
| Clásico · solo | 49.050 | MAESTRO | MAESTRO |
| Clásico · dúo | 76.290 | MAESTRO | LEYENDA |
| Clásico · trío | 22.600 | APRENDIZ | EXPERTO |
| DESATADO · solo | 110.750 | LEYENDA | LEYENDA |
| DESATADO · dúo | 74.560 | EXPERTO | MAESTRO |
| DESATADO · trío | 67.930 | CAZADOR | EXPERTO |
| DESATADO · escuadra | 64.310 | CAZADOR | EXPERTO |

- **El porqué, para no volver a multiplicar por jugadores:** los puntos del
  laberinto son los mismos lo jueguen uno o cuatro. En equipo solo se gana
  aguante (vidas, reapariciones), y las marcas de equipo salían **parecidas o
  más bajas** que las de solo. Con x4 una escuadra no llegaba ni a EXPERTO.
- **Se compararon tres opciones**: x1,5 fijo para cualquier equipo (la que yo
  recomendaba), la escalonada suave (**elegida**) y x1 igual que solo
  (descartada: regalaba LEYENDA de dúo a gente que en solo no pasa de 20.000).
- Nadie perdió nada: todos los escalones bajaron.
- **Lo que puede pedir otra vuelta:** si con más partidas de trío y escuadra se
  ve que siguen siendo difíciles, la siguiente parada natural es x1,5 fijo. Es
  cambiar dos números.

**2 · F1–F4 enseñan la maestría de cada formato** (Ctrl+Espacio sigue siendo la
de la partida). El mundo es siempre el que se juega, y la chapa lleva una
pestaña encima con DÚO/TRÍO/ESCUADRA; **la de solo sale limpia, sin pestaña, a
petición expresa**. Viaja por red como un campo `f` más en el aviso `badge`;
**no hizo falta subir `CFG.NET.PROTO`**: quien no lo conozca pinta la chapa sin
pestaña. En móvil, cuatro botones al lado de MI MAESTRÍA. Por mirar jugando: si
en algún portátil F1–F4 van con `Fn` y resulta incómodo.

**Lo de antes el mismo día**:
DESATADO dejó de doblar el escalón del arcade y pasó a tener **su propia tabla**
de maestrías —5.000 / 15.000 / 30.000 / 55.000 / **100.000** (LEYENDA) /
175.000—, sobre la que el formato multiplica (hoy x1,25 / x1,5 / x1,75). Antes
salían de doblar los del arcade (6.000 / 16.000 / … / 120.000 / 200.000), que
eran cifras heredadas y no elegidas. El listón bajó en todos los escalones, así
que nadie perdió una insignia ya conseguida. Si algún día otro mundo necesita
escalones propios, el mecanismo ya está puesto: se le da su tabla en
`js/badges.js` y `goal` la usa; sin tabla, sigue con la de siempre.

> **Lo único que puede pedir otra vuelta** es el número en sí: si 100.000 se
> siente alcanzable en una buena partida de DESATADO en solo, o si se queda
> corto o largo. Eso solo se sabe jugando; cambiarlo es una línea.

**CACERÍA sigue igual de pendiente: está entera pero SIN PROBAR CON GENTE.** Cuatro
personas al mando de los fantasmas contra el Pac-Man de la máquina es lo único
que no se puede simular. Lo que hay que mirar en la primera party de verdad:

1. **¿Se caza o no se caza?** Si Pac-Man se escapa siempre, bajar
   `CFG.CAZA.VEL_PAC` (hoy 1.1) a 1.05 o 1.0; si cae sin pelea, subirlo. Es
   el único mando del equilibrio y está explicado en `js/config.js`.
2. **¿Los 20 s / 6 s / 3 s de aviso se sienten bien?** Están en
   `CFG.CAZA.PERIODO`, `DURACION` y `AVISO`, por ronda. Medidos solo contra
   los fantasmas de la máquina (ver más abajo).
3. **¿Se ve el aro y se oye la cuenta atrás en el móvil?** El aro es de 1.5 px
   de trazo sobre un Pac-Man de 13.

Detrás de eso sigue lo de siempre: **el remitente de correo.**

La recuperación de contraseña está entera, probada contra el servidor de verdad
y desplegada. Lo único que falta es quién manda el mensaje, y eso son cuatro
campos en el panel de Supabase. El paso siguiente, en orden:

1. Sacar la **contraseña de aplicación de Gmail** (16 letras) en
   <https://myaccount.google.com/apppasswords>. Si esa página no aparece, es que
   falta encender la **verificación en dos pasos**.
2. Ponerla en Supabase → *Authentication → SMTP Settings* con la tabla de más
   abajo. (O pasársela a quien esté trabajando en esto, que lo aplica por la
   API de gestión como todo lo demás.)
3. Subir `rate_limit_email_sent`, hoy clavado en **2 por hora** justo por no
   haber SMTP propio.
4. Lanzar `node supabase/correos.js` con el token en `SBP`: pone los correos en
   español y con la pinta del juego. **No funciona antes del paso 2**, Supabase
   lo prohíbe.
5. Probar de punta a punta con una cuenta de usar y tirar, y borrarla.

Hasta que eso esté, quien olvide la contraseña **sigue perdiendo la cuenta**:
el enlace se pide bien, se genera bien y no llega a ningún buzón.

> Se descartó **Resend** expresamente. Y antes se descartó el **código de
> recuperación** de 16 caracteres (se enseñaba una vez y había que apuntarlo)
> por incómodo: el juego es para jugar con amigos, no para custodiar una llave.
> No volver a proponer ninguno de los dos sin un motivo nuevo.

**Y una cosa pequeña:** `capturas/gameplay.png` es de antes de rehacer el
laberinto, así que enseña las paredes gordas y con las esquinas en escuadra.
Regenerarla cuando se toque el README o se enseñe el juego a alguien.

---

## Por dónde iba esto

**Todo está subido y desplegado.** Nada a medias, nada sin commitear.

| Commit | Qué |
|---|---|
| `d6ff09f` | Las maestrías de equipo piden x1,25 / x1,5 / x1,75 en vez de x2 / x3 / x4 |
| `39a898b` | La maestría de SOLO se enseña sin pestaña de formato |
| `978e8f3` | F1–F4 enseñan la maestría de cada formato, con pestaña en la chapa |
| `b24355c` | DESATADO tiene su propia tabla de escalones de maestría |
| `4101051` | CACERÍA: todos de fantasma contra un Pac-Man de máquina |
| `2cd70d8` | Los fantasmas azules ya no se atraviesan sin mordisco |
| `4721225` | ARO pasa a ser la última skin y PÍXEL la penúltima |
| `11104fb` | Devuelve la rejilla a la skin PÍXEL, ahora dibujada a propósito |
| `9a1a195` | La skin PÍXEL vuelve a parecer un Pac-Man |
| `2d14842` | Los dientes del mordisco se dibujan en el idioma de cada skin |
| `3fab4a9` | Las recargas viajan en la instantánea, no solo en el aviso de uso |
| `241367d` | Las recargas se ven en segundos, y también las de los compañeros |
| `e31f71e` | Paredes más estrechas: Pac-Man ya no comparte píxeles con el muro |
| `044b181` | Muros más delgados: el laberinto se dibuja a escala de pantalla |
| `85e9776` | Las paredes del laberinto giran con curva, como el arcade |
| `0e1d8a6` | Las zonas sin subir vuelven a ser las cuatro del arcade |
| `c15ab02` | La Q ya no falla cuando Pac-Man y el fantasma van de frente |
| `062e6fb` | Deja listos los correos del juego, a la espera del SMTP |
| `24efd3a` | La cuenta se recupera por correo, los poderes de todos se oyen y VS deja repetición |
| `6963ec9` | La cuenta ya no se pierde, DESATADO se juega entre dos y el fantasma responde |
| `ca8ee5b` | El día correcto, el reto solo de hoy, los laberintos como manda el arcade y una dificultad que no puede mentir |
| `dce5685` | El DAILY: siete retos por semana, y ya no son un modo de juego |
| `5d7daec` | Seis laberintos, y cada uno con una idea distinta |
| `2b9c3c2` | DESATADO, la Q que ya no te mata en party y una portada que impone |

Service worker en **`pm-v41`**. **294 pruebas**: 0 fallos en `tests.html` y
los 4 de siempre en Node (ver más abajo).

### Lo del 7 de septiembre: CACERÍA

El qué está en `CHANGELOG.md` y el cómo en `SPEC.md` (sección *Modo
CACERÍA*). Aquí, lo que hay que saber antes de tocarlo:

- **El Pac-Man de la máquina es un ASIENTO MÁS** (`pacs[playerCount]`, con
  `bot = true`), no una entidad aparte. Es lo que hizo que game.js casi no se
  tocara: come, muere, reaparece y viaja por la red por los mismos caminos que
  uno de carne. Todo lo que lo distingue está señalado con `bot` en el sitio
  (`isLocalAuth`, nombres, colores, logros, vigilante de red, mirón).
- **Las superpastillas se sirven como puntos** en `loadPellets`, así que el
  nivel sigue teniendo 244 y el fin de nivel no cambia.
- **El equilibrio se midió en Node contra los cuatro fantasmas de la máquina**
  (todos fuera de la casa desde el principio, que es lo que pasa con cuatro
  personas): a velocidad normal el bot no pasaba del primer minuto. Se
  arreglaron tres cosas de su IA —un fantasma no da marcha atrás, no ir a por
  un punto que solo tiene detrás un bolsillo de dos casillas, y no perseguir
  azules por caminos que cruzan la puerta de la casa (los comidos vuelven a
  salir SIN estar azules)— y se le dio un x1.1 de velocidad (`VEL_PAC`). Con
  eso aguanta unos tres minutos y una ronda y pico contra la máquina. **Contra
  personas no se ha probado**: ver arriba.
- **Los tiempos son POR RONDA** (nivel − nivel de inicio), no por nivel
  absoluto, para que una partida escale siempre 1 → 2 → 3.
- **Las repeticiones locales NO se graban en este modo**: el formato guarda un
  asiento por jugador y aquí hay uno más. Las de red sí (van por
  instantáneas). Si algún día se quiere grabar en local, hace falta un modo
  nuevo en `js/replay.js` (`MODOS`) que sepa que `jugadores + 1` asientos.
- **`CFG.NET.PROTO` es 8**: quien no recargue no puede entrar en una party
  con la versión nueva.
- **Se descartó** que el bot use los poderes de DESATADO: `caza` se apaga si
  `hab` está puesto. Un bot con Q/W/E/R es otro juego y otra IA.

### Ideas para más adelante (CACERÍA, no hechas)

Ordenadas por lo que cuestan; ninguna está empezada.

- **Laberinto por ronda**: ronda 1 el clásico, 2 y 3 dos de LABERINTOS. La IA
  del bot ya trabaja sobre `CFG.MAZE` (monta el grafo por trazado), así que lo
  que falta es que `resetLevel`/`guestReady` cambien de laberinto por nivel y
  que el mirón lo sepa. Es lo que más cambiaría la partida con menos código.
- **Sin superpastillas, con fruta que las sustituya**: una fruta que, en vez de
  puntos, adelante el poder 5 s. Le daría al bot un motivo para arriesgar.
- **Bonus por acorralar**: si dos cazadores están a dos casillas cuando cae
  Pac-Man, los dos cobran (hoy cobra solo el que toca). Empujaría a jugar en
  equipo, que es lo que hace bueno el modo.
- **Elroy inverso**: con menos de 20 puntos, que el bot corra un 5% más, como
  Blinky. Hoy el final de ronda es cuando más fácil es cazarlo.

> **Quien ya tuviera el juego abierto necesita RECARGAR** para ver todo esto:
> el service worker sirve lo que tiene cacheado hasta que se recarga. Pasó
> durante la sesión —los compañeros no veían un cambio recién subido— y costó
> un rato entender que no era un fallo del código.

> Lo del servidor está aplicado y comprobado contra el proyecto de verdad:
> permisos, configuración de auth, la función `cuenta` y la tabla
> `repeticiones`. Lo único que le falta al servidor es el SMTP de arriba.

### El detalle del SMTP

Los cuatro campos de *Authentication → SMTP Settings*, para no tener que
buscarlos:

| Campo | Valor |
|---|---|
| Host | `smtp.gmail.com` |
| Puerto | `465` |
| Usuario | la dirección de Gmail |
| Contraseña | la **contraseña de aplicación** de 16 letras (no la del correo) |
| Remitente | esa misma dirección de Gmail |

Por qué hace falta: sin `smtp_host` configurado, Supabase usa su remitente de
prueba, que manda **2 correos por hora en todo el proyecto** y está pensado
solo para desarrollo, no para escribir a gente de fuera. Se comprobó a mano —
`/auth/v1/recover` devuelve 200 y el mensaje no sale. Gmail aguanta unos 500 al
día, que para cinco amigos sobra.

Lo demás del circuito está hecho y probado contra el servidor de verdad: se
pide el correo al registrarse, se entra con usuario, «he olvidado la
contraseña» resuelve el correo y le pide a Supabase que mande su enlace, y el
juego recoge ese enlace y pide la contraseña nueva.

### Lo que hay que hacer a mano

- **Todo el mundo que ya tuviera cuenta debería ponerse su CORREO DE
  RECUPERACIÓN** (PERFIL → CORREO DE RECUPERACIÓN). Las cuentas de antes
  llevan el correo interno de mentira, así que entran igual pero **no pueden
  recuperar la contraseña**: hasta que lo pongan siguen exactamente como antes,
  olvidar la contraseña = perder la cuenta. El panel del perfil se lo dice a
  quien no lo tiene.
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

- **Se pide el correo DE VERDAD al registrarse** y la recuperación es la de
  toda la vida: pides el enlace, te llega, y el juego te pide la contraseña
  nueva. Se probó primero con un código de recuperación de 16 caracteres —se
  enseñaba una vez y se apuntaba en un papel— y se descartó **por incómodo**:
  el juego es para jugar con amigos, no para custodiar una llave.
- **Se sigue entrando con USUARIO**, que es lo que sostiene todo el resto del
  juego (el ranking, la party, los amigos y las invitaciones van por el
  nombre). Quien resuelve usuario → correo es la Edge Function `cuenta`, con la
  service role: **el correo de nadie baja nunca al navegador**. Si el juego
  pudiera preguntarlo para entrar, cualquiera sacaría la lista de correos con
  los nombres del ranking.
- **El alta también pasa por la función**, y no por gusto: si el usuario ya
  estuviera cogido después de crear la cuenta de auth, quedaría una cuenta
  huérfana Y el correo de esa persona quemado, sin poder reintentar con otro
  nombre. La función lo deshace (`DELETE` del usuario) si el perfil no entra.
- **No hay ninguna tabla nueva.** El correo vive donde ya vivía: en
  `auth.users`, que no es público. La tabla `recuperacion` del intento
  anterior se tiró.
- **Ojo con esto si algo falla:** hizo falta
  `grant select, insert, update on public.perfiles to service_role`. La service
  role **se salta el RLS pero NO los permisos de tabla**, y sin eso la función
  recibe un 42501 pelado y contesta «usuario o contraseña mal» sin ninguna
  pista. Costó dos vueltas; está en `supabase/cuentas.sql`.
- **Configuración de auth que hubo que tocar** (por la API de gestión, no por
  SQL): `site_url` y `uri_allow_list` apuntando al juego —si no, el enlace del
  correo lleva a `localhost:3000`— y `mailer_secure_email_change_enabled` a
  **false**, porque con eso encendido cambiar de correo pide confirmación
  también en el ANTERIOR, que para las cuentas que más lo necesitan es un buzón
  que no existe.
- **Usuario que no existe y contraseña mala dan la MISMA respuesta**, aunque
  los nombres sean públicos: no hay ningún motivo para regalar la lista.
- **Lo que falta:** el SMTP. Ver arriba, en la primera sección.

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

- Cada uno tiene el suyo en `js/audio.js`, y **suenan los de todo el mundo**:
  que a alguien le quede una habilidad menos es información de la partida, y un
  mordisco se oye venir. Los de los demás entran al **10%**
  (`CFG.HAB.VOL_AJENO`), porque a volumen entero una party de cuatro son
  dieciséis teclas peleándose con el waka.
- **Dónde se dispara el sonido de los demás** tiene truco: MORDISCO y GRITO
  pasan por su propia función también en el anfitrión, así que salen bajitos
  solos (`sonDe` mira `mio()`); TURBO, FLASH y los dos del fantasma solo se
  *marcan*, así que hay que sonarlos a mano en `peticion` (anfitrión) y en
  `evento` (eco). `hostEvt` no se aplica en local, así que nada suena dos veces.
- **El mordisco al aire suena DISTINTO al que acierta** (`playBiteMiss`).
  Fallar la puntería y tener la tecla en recarga se sentían exactamente igual.
- Los dos del fantasma van más graves a propósito: en una partida donde los dos
  bandos tienen teclas, la altura es lo único que dice de qué lado vino el
  sonido sin apartar la vista.
- Con **dos en el mismo teclado los dos suenan enteros**: ahí no hay «el otro»,
  los dos están mirando la misma pantalla.

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
- **Y PAC-MAN VS. en local ya deja repetición.** No la dejaba: el rumbo de
  quien lleva fantasma lo interceptaba `Versus.steer` ANTES de llegar a
  `Replay.entrada`, así que la repetición salía con la mitad de las órdenes y
  al verla el fantasma humano se movía por su cuenta. Ahora `Game.setPacDir`
  **graba primero y reparte después**, para todos por igual, y el reparto de
  fantasmas viaja dentro de `ajustes.ghosts` (`g-1` = J1 Pac-Man, J2 BLINKY),
  con dos modos nuevos: `vs` y `habvs`.
  - Las banderas que van detrás de los cuatro ajustes fijos **se leen por lo
    que son, no por su posición**: así se puede añadir otra sin descolocar las
    de al lado.
  - Lo que prueba de verdad que funciona no es que cuadre la puntuación, sino
    que **el fantasma humano acabe en la misma casilla**. Eso es lo que mira la
    prueba.

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

## Lo del 5 de septiembre: los fantasmas azules ya no se atraviesan

Un commit, subido y desplegado. Venía de jugar: *«sigue pasando mucho que
cuando los fantasmas están en modo azul, los atravieso sin matarlos; lo mismo
con mis compañeros»*.

**El fallo no era del modo azul.** El juego dibuja a Pac-Man y a los fantasmas
con **13 px de ancho** (`CFG.PAC_R`) encima de **casillas de 8 px**, y el
mordisco solo contaba si los dos ocupaban **la misma casilla**. Dos en casillas
contiguas ya se solapan medio cuerpo en pantalla: se veía el mordisco y no
había mordisco.

**Medido antes de tocar nada** (40 partidas simuladas de 4.000 ticks, con los
fantasmas azules siempre y Pac-Man dando tumbos): **737 ticks de solape sin
mordisco**, y en el peor caso los dos centros llegaron a quedar **a medio
píxel** el uno del otro sin que contara. Uno de cada diez encuentros pegados se
perdía así. Después del arreglo: **cero**, y 154 fantasmas comidos donde antes
123.

**El arreglo:** en `js/game.js` hay ahora dos varas en vez de una.

- **`biteGhost` (comer):** las casillas se comparan **como cajas** — cuenta si
  la de uno pisa la del otro (menos de 8 px en los dos ejes). Es la versión
  continua de «compartir casilla»: no depende de en qué píxel caiga el tick y,
  por lo mismo, tampoco se le escapa el **cruce de frente** (mucho antes de
  intercambiar casillas las cajas ya se pisan). Como todo va encarrilado a la
  rejilla de 8, dos separados por una pared quedan **justo a 8 px**: nunca se
  muerde a través de una esquina.
- **`hitGhost` (morir):** compartir casilla, tal cual, **sin tocar**.

> **Decisión, para no deshacerla sin querer:** la asimetría es a propósito. Se
> descartó ensanchar también la muerte. Nadie se quejó de no morir; hacerlo
> costaría vidas que hoy no se pierden y **descuadraría los récords ya
> puestos** frente al top mundial. Además, que dos que se cruzan de frente se
> atraviesen es comportamiento del arcade de 1980, está documentado y **tiene
> su propia prueba** en `tests.js` («cruzarse de frente con un fantasma deja
> pasar»). Si algún día se quiere simétrico, es cambiar `hitGhost` por
> `biteGhost` en la rama de muerte — asumiendo las dos consecuencias de arriba.

Vale igual para los compañeros y para el online: la regla es la misma para
todos los Pac-Man de la partida, y **el invitado muerde con la misma vara que
el anfitrión** (`guestCollisions`), que si no se le escaparía en su pantalla
algo que el anfitrión sí le da por comido medio segundo después.

**Cómo se comprobó:** cinco pruebas nuevas en `tests.js` (mordisco sin
compartir casilla, cruce de frente contra fantasma azul, que **no** se muerde a
través de la pared, que estar al lado de uno que no está azul **no** mata, y la
del invitado). **277 pruebas, 0 fallos** en `tests.html`; en Node los 4 de
siempre. Y probado además sobre el juego de verdad, no solo sobre las pruebas.

> Ojo con `tests.html`: si se abre **dos veces seguidas sin limpiar
> `localStorage`**, falla «una maestría ya conseguida no se vuelve a celebrar».
> No es del código —es que la primera pasada deja la maestría guardada—. Con el
> almacenamiento limpio pasan las 277.

---

## Lo del 3 de septiembre: la Q, el laberinto y las skins

Once commits, todos subidos y desplegados. No queda nada a medias.

### La Q que no acertaba de frente (`c15ab02`)

**El fallo:** Pac-Man y un fantasma van de cara, se pulsa Q y el que muere es
Pac-Man. No era mala puntería: yendo de frente los dos se acercan casi **2 px
por tick**, así que desde que el fantasma entra en los 16 px del alcance hasta
que pisa su casilla pasan **cinco o seis ticks** — menos de 100 ms, la tercera
parte de lo que tarda una persona en reaccionar. Se pulsaba cuando se decidía,
con el fantasma a tres o cuatro casillas, y la dentellada salía al aire.

**El arreglo:** la Q pedida pronto se queda ARMADA `CFG.HAB.BITE_BUFFER` (18
ticks, 0,3 s) y muerde sola en cuanto alguien entra a tiro. Mismo patrón que
`nextDir` con los giros. Se resuelve en `Hab.paso()`, que corre al principio
del tick antes de que nadie se mueva, así que el mordisco siempre entra un tick
antes de que el fantasma pueda pisar la casilla. **No regala alcance**: dos
casillas siguen mordiendo, tres no, y fallar sigue sin gastar recarga.

> **Descartado:** retrasar el sonido de la dentellada al aire hasta que expire
> el margen. Se probó y 0,3 s se notan —a partir de un décimo de segundo el
> sonido se despega de la tecla— y además sería mentir: el golpe ocurre en ese
> tick. Suena en el acto; si la Q armada acierta después, es una segunda
> dentellada de verdad y suena como tal.

### Las zonas sin subir estaban mal convertidas (`0e1d8a6`)

El arcade prohíbe girar ARRIBA en cuatro cruces, y las teníamos en las filas
13 y 25 en vez de 11 y 23: **el original las da sobre la PANTALLA (36 filas) y
`CFG.MAZE` es solo el laberinto (31), que empieza `CFG.TOP_ROWS` = 3 más
abajo**. Se restó uno en vez de tres. En el clásico las cuatro sobrantes caían
en muro y no hacían nada; en los seis laberintos alternativos caían en pasillo
recto y el fantasma **daba media vuelta en mitad del pasillo**.

### El laberinto, en tres pasos (`85e9776`, `044b181`, `e31f71e`)

1. **Esquinas redondeadas.** El arcade no gira en ángulo recto.
   `Game.wallEnd()` clasifica cada extremo (convexa / cóncava / recta) y emite
   el cuarto de arco. Los dos lados que se juntan en una esquina emiten el
   MISMO arco: sale más barato repetirlo que coordinar quién lo pinta.
2. **Trazo más fino.** El laberinto se dibuja YA a escala de pantalla y se
   pega 1:1, que es lo que permite un trazo de menos de un píxel nativo
   (`CFG.WALL_LINE` = 2 de los 3 que hay). Con `WALL_LINE = CFG.SCALE` sale el
   dibujo de antes.
3. **Muros más estrechos.** `CFG.WALL_INSET` 2 → 3. Era una cuenta, no una
   impresión: **Pac-Man mide 13 px y el pasillo dejaba 12**, así que compartía
   píxeles con el muro. Ahora el hueco es 14. El radio de esquina pasó a
   calcularse **por esquina** (`Game.radioEsquina`) porque un tope global
   habría dejado sin curva a todos los bloques por culpa de los cuatro muros
   de una casilla.

> El radio de Pac-Man vive ahora en `CFG.PAC_R` (antes suelto en sprites.js)
> **porque es la mitad de esa cuenta**, y una prueba compara los dos números:
> ni el muro ni Pac-Man pueden volver a crecer hasta tocarse en silencio.

### El HUD de las recargas (`241367d`, `3fab4a9`)

Cada poder enseña **los segundos que le faltan** (`Hab.restan`, redondeado
hacia arriba) en el sitio del nombre, y hay **una fila por compañero** con su
nombre en su color.

**Y el aviso de uso no bastaba.** Se manda una vez y nadie lo confirma —el
transporte es Supabase Realtime en broadcast, sin acuse— así que el que se
perdiera dejaba esa casilla mintiendo el resto de la partida. Las recargas van
ahora también en la instantánea (`hb` en `buildSnapshot`), que sale doce veces
por segundo: un aviso caído se repara en ~0,2 s. **La propia solo se corrige
hacia arriba**, o al pulsar se encendería medio parpadeo mientras el aviso
viaja.

### Los dientes y la skin PÍXEL (`2d14842`, `9a1a195`, `11104fb`)

Los dientes de la Q **salen siempre**, lleve la skin que lleve —son el aviso de
que la tecla entró— pero se dibujan en el idioma de cada una: bloques en
PÍXEL, y en ARO metidos hacia dentro de la boca porque encima del labio se
leían como un brillo.

La skin PÍXEL se rehízo entera: rejilla centrada (antes no tenía eje), bloques
enteros en la rejilla de pantalla, y la boca comiendo celdas enteras para que
los labios salgan rectos.

> **Ojo con esto:** la RAYA entre bloque y bloque **es el estilo**, no un
> defecto. Al rehacerla la quité tomándola por suciedad —en la primera versión
> salía de rebote, del difuminado— y hubo que devolverla (`PIX_RAYA`, un píxel
> de pantalla, dibujado a mano). No volver a "limpiarla".

> **Descartado:** dientes en contorno para la skin ARO. El diente mide dos
> píxeles de base, así que a tamaño de partida el trazo se lo come entero y
> queda un borrón. Está anotado en el código.

### Las skins cambian de sitio (`4721225`)

**PÍXEL al nivel 20 y ARO al 30.** A quien ya la llevaba PUESTA no le cambia
nada (`Level.skinsAllowed` siempre deja pasar la puesta), pero **entre el nivel
20 y el 29 ahora se tiene PÍXEL en vez de ARO**.

### Cómo se miró todo esto

Lo visual, **renderizando a escala de partida y ampliando la imagen ya
pintada**. Ampliar el dibujo vectorial engorda el trazo y miente: con eso el
aro parecía correcto cuando no lo era.

Lo de red, con **tres "navegadores" de verdad** cableados entre sí (ver
`pruebas-node.js` cargado tres veces). Es lo único que demuestra que un aviso
perdido se repara solo.

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
| Juego (Vercel) | desplegado, service worker `pm-v29` (15 de agosto) |
| `grant select, insert, update on perfiles to service_role` | aplicado (15 de agosto) |
| Edge Function `cuenta` (`verify_jwt: false`) | desplegada y comprobada de punta a punta (15 de agosto) |
| Auth: `site_url`, `uri_allow_list` y cambio de correo sin confirmar el viejo | aplicado (15 de agosto) |
| **SMTP propio para que el correo llegue** | **PENDIENTE — ver arriba** |
| `repeticiones` (enlaces de repetición online) | aplicada y comprobada (15 de agosto) |
| `reto_diario` y su vista `reto_top` | **TIRADAS** (15 de agosto) |
| `recuperacion` (el intento del código, descartado) | **TIRADA** (15 de agosto) |
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

Hoy hay **254 pruebas**. `node pruebas-node.js` termina con **4 fallos** y eso
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

### 1. Poner el SMTP (lo único que bloquea algo hoy)

Está explicado arriba del todo. Sin él, la recuperación de contraseña está
montada, probada y desplegada... y el correo no llega. Es media hora de panel
de Supabase y ninguna línea de código.

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
