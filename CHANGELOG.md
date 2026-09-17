# Historial de cambios

Juego en producción: <https://pacman-topmundial.vercel.app>

## 2026-09-17 · GAME OVER: botones simétricos

- MENÚ va como INSERT COIN: misma letra, alto y relleno alrededor del texto
  (cada uno a lo ancho de lo suyo), hueco con borde amarillo.
- Lo mismo en todos los diálogos de recreativa (pausa, partida a medias,
  rendirse, revancha...): los botones secundarios ya no son texto suelto.

## 2026-09-17 · PARTIDA A MEDIAS con marco de recreativa

- El aviso de que tienes una partida guardada al empezar otra usa el marco de
  la pausa: ficha con el modo, los puntos, el nivel y cuándo se guardó, el
  aviso de que se pierde en naranja y los botones de siempre.

## 2026-09-17 · Escudo aliado de 8 s y botones con línea

- El **ESCUDO ALIADO** del Soporte dura **8 s** (o hasta el primer golpe). A
  solas sigue sin salir: el Soporte necesita compañeros.
- Los botones de los diálogos (pausa, GAME OVER, VOLVER, elegir jugadores...)
  ya no se rellenan al señalarlos: una línea recorre su borde, como en el DAILY.
  Los que ya van rellenos de color (REANUDAR, JUGAR OTRA VEZ...) no la llevan.
- Los botones de los diálogos van más separados, y en la pausa GUARDAR Y SALIR
  se llama solo GUARDAR (hace lo mismo: guarda la partida y sale).

## 2026-09-17 · SOPORTE: teclas que se mantienen

- **Q**: pulsada y soltada sigue siendo el DISPARO HELADO. **Mantenida 2 s**
  deja una **placa de hielo** en el suelo durante 8 s: todo fantasma que la
  pise (los que te venían persiguiendo) se queda congelado 3 s.
- **E**: pulsada y soltada, escudo al compañero más cercano. **Mantenida 3 s**,
  escudo a **todos** los compañeros a 2 casillas a la redonda.
- Mientras mantienes, un aro cian alrededor del Soporte se va llenando.
- **W · INMUNIDAD** dura 3 s (antes 2).
- Las repeticiones graban las teclas mantenidas. Hay que actualizar para
  jugar en party con alguien que tenga la versión nueva.

## 2026-09-17 · DESATADO: cuatro roles

- Antes de jugar DESATADO cada jugador elige **rol**, con sus propios cuatro
  poderes en Q W E R:
  - **ASESINO** (el de siempre): mordisco, turbo, flash y grito. Puntúa.
  - **TANQUE**: PROVOCAR (5 s en los que todos los fantasmas van a por ti e
    ignoran a tu equipo), ESCUDO (8 s o hasta que un golpe lo rompa),
    PISOTÓN (6 s en los que los fantasmas a 10 casillas huyen de ti) y la
    APISONADORA (en línea recta hasta la pared, más rápido e imparable,
    comiéndote a todo fantasma que toques).
  - **SOPORTE**: DISPARO HELADO (congela), INMUNIDAD, ESCUDO ALIADO y VIDA
    EXTRA (cada 5 minutos). Solo uno por partida.
  - **MAGO**: BOLA DE FUEGO, PORTAL (dos bocas que cruza todo el equipo), RUNA
    (trampa) y TORMENTA (rayos). Lo que mata vale 200 fijos.
- A solas con Tanque, Soporte o Mago la partida es de **práctica**: da
  experiencia y logros, pero no récords, top mundial ni maestrías. En equipo
  cuenta como siempre.
- En party cada uno elige su rol en la sala.

## 2026-09-17 · Presentación de DESATADO y CACERÍA

- Antes de jugar, en vez del muro de líneas centradas: marco de recreativa
  con el color del modo, una frase, **cuatro cartas** (los poderes con su
  tecla y su recarga en DESATADO; presa, poder, caza y truco en CACERÍA), los
  mandos de solo y de dos jugadores en dos columnas y una línea al pie.
- DESATADO decía que no entraba en el TOP MUNDIAL: ya tiene su propia liga,
  con récords y maestrías.
- Las luces alrededor del emblema de maestría en partida son más suaves.

## 2026-09-17 · La maestría en partida: solo el emblema

- Ctrl+Espacio y F1..F4 ya no sacan la chapa con el nombre: sobre la cabeza
  sale **solo el emblema de oro**, armándose pieza a pieza mientras sube, con
  la pompa de su rango (ondas, rayos, estrellas, fogonazo) y se encoge de
  vuelta al terminar. Se arma a su velocidad real y la insignia dura 5,5 s
  (antes 2,5 s, con el armado acelerado: no se llegaba a ver).
- La franja de «¡MAESTRÍA DE…!» de las partidas de varios lleva también el
  emblema en lugar de la medalla redonda.

## 2026-09-17 · MAESTRÍAS: emblemas de oro y el trono

- Cada maestría tiene su **emblema** de oro con incrustaciones verde azulado y
  una silueta que evoluciona: pilar, alas, arco y gema, escudo con cuernos y
  estandarte, anillo con alas bajas, y en TOP MUNDIAL el sol de rayos con la
  gema tallada en la cima. Se **arman pieza a pieza** al aparecer.
- La vista MAESTRÍAS es ahora **el trono**: la liga se elige con dos
  desplegables (mundo y formato), tu maestría sale en grande con tu récord,
  lo que pide y la barra hacia la siguiente, y abajo el camino de los seis
  emblemas con una línea de oro hasta donde llegaste. Los que no tienes se ven
  como silueta apagada; pulsar uno lo enseña en grande.

## 2026-09-17 · Pósters animados en el carrusel de modos

- Cada modo tiene su **póster** (propuesta Retrato): CLÁSICO comiéndose la
  pastilla, DOS JUGADORES rodeados, DESATADO con colmillos, CACERÍA con Blinky
  en rojo, LABERINTOS girando la esquina y ONLINE con el wifi cargando.
- Título inclinado, etiqueta y frase encima; se inclina en 3D con el ratón y
  lo cruza un destello. LABERINTOS y ONLINE tiñen la tarjeta entera al cambiar
  de color. Los vecinos del carrusel asoman con su póster apagado.

## 2026-09-17 · Revivir al compañero

- Con **vidas propias**, quien se queda sin vidas deja **su cuerpo tirado**
  donde cayó, con las pasadas que lleva (0/5) y un aro con el tiempo.
- **Pásale por encima 5 veces en 30 segundos** y vuelve ahí mismo con 1 vida
  y 5 segundos de escudo (un aro cian).
- Si el cuerpo desaparece, **al acabar el nivel sale REVIVIR**: quien está
  fuera puede pagar 1.000 monedas para volver en el nivel siguiente. Se espera
  hasta 10 segundos; en local se puede pasar con SIGUIENTE NIVEL.
- Ya no se paga a mitad de nivel: el aviso de abajo desaparece.

## 2026-09-17 · CONTINUAR por 1.000 monedas

- **Al quedarte sin vidas, 10 segundos para seguir:** CONTINUAR cuesta 1.000
  monedas y sigues en el mismo nivel, con tus puntos y 1 vida. La partida
  continuada cuenta entera para el TOP MUNDIAL.
- **JUGAR OTRA VEZ** está bloqueado mientras corre la cuenta atrás; al
  acabarse sale el GAME OVER. Si juegas solo y no te llega, GAME OVER directo.
- **En party** cada uno paga lo suyo. Quien no paga se queda mirando dentro
  de la sala, y quien se queda sin vidas mientras los demás siguen tiene sus
  10 segundos para volver (aviso abajo, tecla C).
- PAC-MAN VS. y CACERÍA no tienen continuar.
- Las repeticiones graban el continuar y se ven igual que se jugaron.

## 2026-09-17 · GAME OVER de recreativa: CONTINUE?

- **Nuevo final de partida**, a pantalla completa: GAME OVER en rojo con
  interferencias, bombillas rojas y tu Pac-Man muriendo en bucle con tu skin.
- El resultado entra **renglón a renglón**: los puntos suben contando, luego
  el récord y el nivel, la experiencia y las monedas. Cada logro cae como un
  sello. Pulsar en cualquier sitio lo acaba de golpe.
- Abajo, la cuenta atrás de **CONTINUE?** junto a INSERT COIN (jugar otra vez,
  R) y MENÚ (ESC). La cuenta atrás solo invita: al llegar a cero no pasa nada.
- PAC-MAN VS. y CACERÍA siguen con su panel de quién ha ganado.

## 2026-09-17 · La portada es una marquesina

- **Portada nueva, como el frontal de la recreativa:** bombillas en el borde,
  marcador arriba (tu récord, el HIGH SCORE mundial y el nº 1 del mes), logo
  latiendo y los fantasmas persiguiendo a Pac-Man bajo el título.
- Tu ficha (nombre con tu aspecto, nivel y daily) a la izquierda; los modos en
  carrusel con los vecinos en perspectiva y JUGAR · INSERT COIN en el centro;
  el cuartel a la derecha con un Pac-Man de cursor y tus monedas.
- **Cinta de noticias** al pie: el podio del TOP MUNDIAL, quién manda este
  mes, el reto de hoy y los días que le quedan a la temporada.
- Los controles y EL REPARTO pasan a **OPCIONES · CONTROLES**.

## 2026-09-17 · Aire y mismo ancho en todas las vistas

- **Todas las vistas tienen el mismo ancho y margen**: ninguna llega al borde
  ni es más estrecha que otra.
- **Nada queda aplastado:** la letra de máquina baja al 75 % (los títulos no),
  con más interlineado y relleno en el daily, botones, vestuario y tienda.
  Ningún texto baja de 10 px.

## 2026-09-17 · Títulos de recreativa y tu nombre con tu aspecto

- **Todos los títulos** llevan el estilo del TOP MUNDIAL: amarillo con las rayas
  del tubo, relieve dorado y brillo. El subtítulo va en rosa entre guiones.
- **En la portada, tu nombre sale con tu aspecto:** tu Pac-Man al lado, con su
  skin, color, accesorio y efecto, moviéndose, y el nombre en tu color. Pulsarlo
  abre el vestuario.

## 2026-09-17 · Letra de máquina en todo el juego

- **Todo el juego usa la letra del TOP MUNDIAL** (Press Start 2P): menús,
  paneles, diálogos y lo que se escribe dentro de la partida (marcador,
  ¡LISTO!, avisos). El marcador queda como el de la recreativa.
- Como esa letra dibuja mal las vocales MAYÚSCULAS con tilde, en mayúscula
  van sin ella (CLASICO, TRIO). La Ñ y las minúsculas con tilde se quedan.
- Ajustados los sitios donde la letra, más ancha, partía o montaba textos.

## 2026-09-17 · Las repeticiones, como un vídeo

- **Reproductor nuevo:** la partida a pantalla completa con los mandos de un
  vídeo abajo (pausa, ±10 s, tiempo, velocidad, compartir, pantalla completa) y
  el título arriba. Todo se esconde solo si no se toca nada.
- **Marcas en la barra** de lo que pasó (rojo muerte, amarillo nivel, cian
  cadena de fantasmas) y **vista previa** al pasar el ratón.
- **Compartir desde este segundo:** el enlace abre la repetición ahí.
- Pulsar la partida o la barra espaciadora pausa, sin abrir ningún menú. Teclas:
  ← → 10 s, 1-4 velocidad, M siguiente momento, F pantalla completa, Q salir.

## 2026-09-16 · Partidas destacadas

- **☆ DESTACAR** en TUS PARTIDAS: la repetición se guarda para siempre y se le
  puede poner nombre. Se ve arriba con ★ y el nombre, y hay filtro ★ DESTACADAS.
- **Las que no se destacan se borran a los 7 días.** Cada fila dice cuántos
  días le quedan (en rojo el último).
- Las destacadas salen en TUS PARTIDAS aunque el historial del navegador ya no
  las tenga. Destacar necesita cuenta.

## 2026-09-16 · Todas las repeticiones, en la nube

- **Cada repetición se sube sola al acabar la partida**, así que todas se pueden
  ver y compartir, también desde otro aparato con la misma cuenta. Antes el
  navegador solo guardaba las 8 últimas locales y las 2 últimas online, y las
  demás se perdían.
- **TUS PARTIDAS, con la tabla de máquina:** fecha, partida (con DESATADO,
  LABERINTOS u ONLINE debajo), puntos, nivel y los botones ▶ VER y COMPARTIR.
  Las viejas que el navegador ya había borrado lo dicen: SIN REPETICIÓN.
- COMPARTIR da siempre el enlace corto con código.

## 2026-09-16 · El top mundial es solo para cuentas

- **Para colocar un récord hay que jugar con cuenta.** Quien bate su récord
  sin ella ve un aviso antes del GAME OVER: si crea la cuenta o entra ahí
  mismo, la partida se sube con su nombre de cuenta.
- El servidor lo exige: la sesión abierta, que quien envía esté entre los que
  jugaron y que **todos** los de la partida tengan cuenta.
- Se borraron del top las 20 partidas con algún nombre sin cuenta (DANIEL,
  IAMBRAI, GOKU, JUGADOR, ANA, BENI, MARTIN, JOSEPH).

## 2026-09-16 · El TOP MUNDIAL, de recreativa

- **La LISTA es la tabla de la recreativa:** letra de máquina, cabecera RANK ·
  NAME · SCORE · LEVEL, cada puesto de un color de fantasma y el 1ST en oro con
  el nombre cambiando de color. La letra va dentro del juego y funciona sin
  conexión (y, como en las máquinas de entonces, sin tildes).
- **Pantalla nueva:** la de récords de una máquina de 1980 con podio dentro.
  Líneas de tubo, 1UP y HIGH SCORE, la cuenta atrás de la temporada en el
  marcador, los tres primeros en cajones de oro, plata y bronce con su avatar,
  y Pac-Man persiguiendo fantasmas al pie. Se puede ver como **PODIO** o como
  **LISTA**.
- **Tu rival** (HERE COMES A CHALLENGER) y los **campeones del mes pasado**
  (HALL OF FAME) a un lado.
- **DESATADO y LABERINTOS tienen su top mundial.** Cada partida va a la tabla
  de su mundo, y el servidor la valida con las reglas de ese mundo.
- Se borraron del top las partidas de prueba (SOLOTEST, BRAI y PEPE).

## 2026-09-16 · La tienda de monedas

- **La ficha respeta las pausas de la partida:** al comerse un fantasma todo
  se congela un segundo con la puntuación a la vista, y al morir se queda
  helado un segundo antes de la animación.
- **La tienda se ha rehecho en torno a las monedas.** El precio va siempre con su
  moneda y comparado con lo que tienes; lo que no alcanza dice cuánto falta.
- **El ticket:** el + de cada cosa la echa al ticket, que resta a la vista y se
  paga de una vez. Arriba, una **meta**: lo más barato que aún no puedes pagar
  y cuántas partidas te faltan.
- **La ficha:** pulsar una cosa abre una ventana donde se ve en movimiento
  (corriendo, comiéndose un fantasma, con la Q y muriendo), con lupa, pausa,
  cámara lenta, otra skin y otro color. Desde ahí se compra y se pone de un
  golpe. La misma ficha está en el **vestuario** (VERLO EN MOVIMIENTO).

## 2026-09-16 · Cuentas que ya no se contagian

- **Cerrar sesión deja el navegador limpio.** Antes el progreso del anterior se
  quedaba y el siguiente que entraba en su cuenta se lo llevaba: por eso las
  cinco cuentas tenían el mismo récord de dúo.
- **Las pruebas ya no abren la sesión de verdad.** Habían subido a SANDROPEPA
  marcas de mentira (99.000 en solo, entre otras); se le han quitado.
- **Una limpieza en la nube manda** sobre lo que tenga guardado cada aparato,
  para que lo quitado no vuelva a subir.
- **CLÁSICO ya no se queda con las partidas de DESATADO.** Cada vez que se
  entraba en la cuenta, CLÁSICO volvía a llevarse todo lo jugado.
- A SANDROPEPA, PIEROSENSUAL y FREDDY se les reparte lo viejo entre CLÁSICO y
  DESATADO **estimado por sus mordiscos**, y la tabla lo dice.

## 2026-09-16 · El tiempo también se reparte

- El reparto declarado de lo viejo (70 % DESATADO) ya se aplicaba a las
  **partidas**, pero las **horas** seguían todas en CLÁSICO. Ahora el tiempo
  de aquellas partidas se reparte con el mismo porcentaje, y sale con
  virgulilla porque es aproximado. Lo jugado después se mide solo.

## 2026-09-16 · Decir tú el reparto de lo viejo

- De qué modo era cada partida de antes no lo sabe ningún archivo: lo sabe
  quien jugó. Ahora **se puede declarar** ("el 70 % de aquello era DESATADO")
  y la tabla reparte con esa palabra, solo las partidas anteriores a que cada
  modo llevara su cuenta. Lo que se juegue después se cuenta solo y no se
  toca. Los números repartidos se enseñan con una virgulilla y el pie dice de
  dónde salen.
- Y algo que estaba roto de raíz: **`hab:partidas` no existía**. Un contador
  por modo solo se guardaba si algún logro lo miraba, y ningún logro de
  DESATADO contaba partidas, así que ese modo habría seguido marcando cero
  para siempre por mucho que se jugara. Ahora los contadores de las cuatro
  cifras que enseña la tabla (partidas, mejor, fantasmas y tiempo) existen
  para los cinco modos.

## 2026-09-16 · La tabla POR MODO, arreglada

- Decía **0 partidas en DESATADO** a quien más lo ha jugado, y le ponía a
  CLÁSICO como mejor marca una partida de DESATADO. El fallo venía de que los
  contadores por modo son más nuevos que el juego: al crearlos, lo ya jugado
  se apuntó todo a CLÁSICO.
- Ahora la tabla no se fía de eso. **La mejor marca de cada modo sale de su
  récord**, que sí se guarda por separado desde siempre. Y las partidas que no
  se pueden saber salen con un **guion** en vez de un cero que miente; las de
  CLÁSICO, con una virgulilla, porque llevan las otras dentro.
- Al pie se explica, que una cifra rara sin explicación es peor que la cifra.

## 2026-09-16 · PERFIL · CIFRAS: todo lo que llevas hecho

- Pestaña nueva en el PERFIL con **todo lo que se sabe de un jugador**:
  partidas, **horas de juego**, puntos de toda la vida, media por partida,
  puntos por minuto, duración media, fantasmas comidos, vidas perdidas,
  fantasmas por vida, **dobles, triples y cuádruples**, pastillas,
  superpastillas, frutas, niveles despejados, nivel más lejos, niveles
  seguidos sin morir, nivel 1 más rápido, mordiscos y muros de DESATADO,
  Pac-Man cazados, retos del DAILY, monedas... y dos tablas: **por modo** (con
  sus partidas, su mejor marca y su tiempo) y **por formato**.
- Y un **polígono de fortalezas** con seis ejes —ATAQUE, PUNTOS, AGUANTE,
  ALCANCE, CONSTANCIA y VARIEDAD— que enseña de un vistazo en qué es bueno
  alguien y en qué no. No es una nota: es una forma.
- **En el perfil de otro jugador salen sus cifras y su polígono encima del
  tuyo**, para compararse de verdad. Sus contadores ya viajaban a la nube; lo
  que faltaba era enseñarlos.
- **Cuatro es el tope de la cadena hoy**, y hay una prueba que lo fija: son
  cuatro fantasmas y ninguno vuelve a ponerse azul dentro del mismo susto, ni
  con el GRITO ni con el MORDISCO de DESATADO. Si alguien tiene guardada una
  cadena mayor, viene de una versión de antes: su marca se respeta.
- Lo nuevo que no estaba contado (tiempo, niveles, pastillas, dobles...) **no
  empieza a cero**: se siembra con lo que ya se sabía de cada uno, siempre por
  lo bajo. El tiempo de antes de hoy es una estimación por los puntos, y la
  pantalla lo dice.

## 2026-09-16 · Partidas preparadas

- Una partida guardada puede partir ahora de un **punto de partida montado a
  mano** (marcador y laberinto a medio comer) en vez de del principio. Sirve
  para dejar el juego en una situación concreta —para probar algo, o para
  recuperar una partida que se perdió antes de que existiera el guardado— sin
  tener que jugar hasta ahí.
- Sale como CONTINUAR igual que cualquier otra, con la coletilla
  **PREPARADA** para que se sepa lo que es. Desde ahí se juega, se guarda y se
  cobra como una partida normal: **lo preparado cuenta como jugado**, con su
  experiencia, sus monedas y su récord.
- Lo que se juegue después sí se graba con normalidad, así que se puede volver
  a dejar a medias las veces que haga falta.

## 2026-09-16 · Arregladas las repeticiones de LABERINTOS

- Una repetición de un laberinto alternativo **se veía en el laberinto de
  siempre**: Pac-Man atravesando muros, los fantasmas por donde no y una
  puntuación que no era la de nadie. La grabación nunca guardó en cuál se
  había jugado.
- Ahora sí lo guarda, y se reproduce en el suyo. Comprobado en los seis.
- Si la repetición viene de un laberinto que este juego no conoce, se dice
  que está rota en vez de enseñarla mal.
- **Las de LABERINTOS grabadas antes de hoy no se pueden arreglar**: no hay
  nada dentro de ellas que diga en cuál se jugó.

## 2026-09-16 · Las repeticiones se ven como un vídeo

- **Barra de tiempo**: se ve por dónde va y cuánto dura, y **se arrastra**
  para ir a cualquier momento. También con las flechas (saltan 10 segundos),
  `Home` y `End` para los extremos y el espacio para pausar.
- **Se puede rebobinar**, que es lo que no había: volver a ver la jugada de
  hace veinte segundos ya no obliga a empezar la repetición otra vez.
- **Cuatro velocidades** (x0.5, x1, x2 y x4) en vez de solo x1 y x2.
- Al abrir una repetición se prepara un momento (unos segundos, con su
  aviso): el juego se la juega entera a toda prisa para poder saltar a
  cualquier punto al instante. Es lo que hace posible todo lo de arriba.
- **El personaje sale con el aspecto de quien jugó**: su skin, su color, su
  accesorio y su efecto. Antes salía con lo que llevaras puesto TÚ, así que
  la partida que te compartía un amigo se veía con tu cara. Los accesorios y
  los efectos, directamente, no se veían.
- Las repeticiones de antes se siguen viendo igual (las que no llevan
  aspecto, con el de siempre).
- En el panel del final hay un **ATRÁS 10 S** para repasar la última jugada
  sin volver a empezar.

## 2026-09-15 · Dejar una partida a medias y seguirla luego

- Hasta ahora una partida solo existía mientras estuviera abierta: cerrar la
  pestaña la tiraba entera. **Ahora se puede dejar donde iba y seguirla**, en
  este ordenador o en otro.
- En el **menú de pausa** hay un botón nuevo, **GUARDAR Y SALIR** (`G`). Y en
  la **portada** sale **CONTINUAR**, con qué partida es, cuántos puntos
  llevabas y cuándo la dejaste (o DESCARTARLA, si ya no la quieres).
- **Con cuenta, la partida viaja contigo.** Se sube cada minuto, así que
  aunque se cierre el navegador de golpe, al entrar en otro aparato está ahí.
- Al recuperarla, el juego **se la vuelve a jugar a toda velocidad** hasta
  donde ibas (unos segundos, con su barra) y te devuelve el mando **en
  pausa**, para que te sitúes antes de seguir.
- **No se cobra dos veces**: guardar y salir no da experiencia ni monedas ni
  récord; eso se cobra entero cuando la partida termina de verdad. Y al
  terminar, lo guardado se tira.
- Se puede en CLÁSICO, DOS JUGADORES, DESATADO, PAC-MAN VS. y LABERINTOS. En
  **CACERÍA y ONLINE no**, y por eso el botón no sale ahí: son las dos que el
  juego no sabe reconstruir. Jugar a ellas tampoco borra la que tengas
  guardada.
- Si el juego cambia por dentro entre que guardas una partida y la retomas,
  al rehacerla puede no salir la misma. **Se comprueba** (puntos y pastillas)
  y, si no cuadra, se avisa en vez de meterte en una partida que no es tuya.
  La guardada no se borra sola: lo decides tú.

## 2026-09-15 · Accesorios bien centrados

- Revisadas las 47 skins con los 11 accesorios, uno a uno. **El parche ahora
  tapa el ojo**, los auriculares van al lado de la cabeza, la cinta ninja por
  la frente y el mostacho bajo la nariz.
- Arreglados también los que quedaban descentrados en su skin: la calavera
  (el gorro iba muy adelantado), el dragón, el pulpo, el robot y el lobo.

## 2026-09-15 · Sombreros bien puestos

- La **gorra de hélice** y el **casco vikingo** se hundían dentro de algunas
  extravagantes y les tapaban el ojo (calavera, tiburón, pez globo, carro).
  Ahora todos los sombreros se apoyan encima de la cabeza.

## 2026-09-15 · El accesorio va pegado a la skin

- En las skins que abren la boca **subiendo la parte de arriba** (el pan de
  la HAMBURGUESA, la tapa del COFRE, la mitad de arriba de la PLANTA) el
  accesorio sube y gira con ella, y el del LOBO acompaña su cabeza al aullar.
- Y en todas las que botan, se mecen o saltan (la calavera, el cuy con su Q,
  el ovni...), el accesorio se mueve con el cuerpo en vez de quedarse quieto.

## 2026-09-15 · Todo combina con todo

- **Las skins extravagantes ya llevan accesorios**: el tiburón con chistera,
  la calavera con gafas, el carro con gorra... Cada una tiene su cabeza
  apuntada, así que las gafas caen en su ojo, los sombreros en su coronilla
  y la pajarita en su cuello.
- Los efectos ya iban con cualquier skin: ahora se puede combinar skin,
  color, accesorio y efecto sin ninguna excepción.

## 2026-09-15 · Vestuario, segunda vuelta

- **Las skins se pueden clasificar por cómo se consiguen**: por nivel, por
  logro, extravagantes, fechas especiales y de tienda, con cuántas tienes de
  cada grupo. En TODAS salen agrupadas con su título.
- **El color, en fichas**: tu skin pintada de cada color, con su nombre, y
  una ficha "A TU GUSTO" que abre el selector.
- **TIBURÓN**: la mandíbula era más gruesa que la panza y parecía postiza.
  Ahora es más fina y casa con el cuerpo, abierta y cerrada.

## 2026-09-15 · El VESTUARIO

- **Todo lo del personaje, en un solo sitio.** El botón SKINS del cuartel pasa
  a ser **VESTUARIO**: skin, color, accesorio, efecto, emotes y avatar, tuyos y
  del jugador 2.
- **Sale solo lo que tienes.** Con "VER LO QUE ME FALTA" aparece el resto,
  apagado y con cómo se consigue.
- **Pulsar es ponérselo**, y se ve al momento en tu Pac-Man corriendo. Lo que
  no tienes te lo puedes **probar** antes de ir a por ello.
- Lo que consigues sale como **NUEVO**, y el botón del cuartel cuenta cuántas
  cosas tienes sin estrenar.
- **La TIENDA ya solo vende**: enseña lo que te falta y, al comprar,
  "PONÉRTELO" te lo pone y te lleva al vestuario.
- **PERFIL** se queda con quién eres (nombre, nivel, cuenta y logros) y un
  acceso directo a tu personaje. No se pierde nada de lo que llevabas puesto.

## 2026-09-15 · El botín cobrado se ve cobrado

- En el botín del DAILY, las monedas ya ganadas parecían un premio esperando
  a que lo reclamaras. Ahora van en verde, con ✓ y la palabra COBRADO.

## 2026-09-15 · La melodía de inicio se calla cuando toca

- **Arreglado:** la música del principio de la partida seguía sonando al
  pausar, al rendirse o al salir al menú. Ahora se corta en los tres casos, y
  al reiniciar vuelve a sonar una sola vez, sin montarse encima.

## 2026-09-15 · Los modos se arrastran

- **Los modos de juego se pueden arrastrar** con el ratón o con el dedo: la
  tarjeta sigue al puntero, el vecino hacia el que vas se enciende y al
  soltar pasa de modo (o vuelve a su sitio si fue poco). Soltar no arranca la
  partida por error.
- **El cambio de modo ahora es una cinta**: la tarjeta que se va sale por un
  lado mientras la nueva entra por el otro, suave y sin saltos.

## 2026-09-15 · Regalo de veterano en la TIENDA

- **Quien ya había jugado recibe monedas por lo hecho**, además de las 1.500
  iniciales: 5 por cada partida y 50 por cada logro, sin tope. Es una sola
  vez; lo que se juegue después se gana como siempre.
- En la TIENDA se ve cuánto fue el regalo. Con cuenta, vale lo jugado en
  cualquier aparato y no se cobra dos veces.

## 2026-09-15 · Elegir modo, como en la recreativa

- **Donde estaban las flechas asoman los modos de al lado**, pequeños y
  apagados, con su icono y su nombre. Se pulsan para pasar a ellos, y la
  tarjeta nueva entra deslizándose desde ese lado.

## 2026-09-15 · El DAILY es una cartilla

- **La semana es una cartilla de siete casillas**, con un fantasma por día.
  Cumplir el reto es cazarlo: se pone azul y le cae el sello CAZADO. El de hoy
  brilla en su color y lo que viene se ve en silueta.
- **En la portada** salen las siete casillas en pequeño, el reto de hoy, las
  monedas que da y **cuánto queda hasta medianoche**. Cuando lo cumples,
  enseña el de mañana.
- **Por dentro, el botín de la semana**: lo cobrado y lo que queda de las 290
  monedas en juego (20 por reto y 150 por la semana entera), y la racha en
  casillas junto a la mejor.
- En el móvil, las casillas se desplazan de lado y se abren en la de hoy.

## 2026-09-15 · Las repeticiones de DESATADO se ven como se jugaron

- **La Q pedida antes de tiempo ya no tuerce la repetición.** El mordisco
  que sale solo se aplicaba un instante tarde al verla, el fantasma tocaba a
  Pac-Man y la partida se torcía (una de 93.870 puntos moría al minuto).
- **Las repeticiones grabadas antes se arreglan solas** la primera vez que
  se abren: sale "PREPARANDO LA REPETICIÓN" unos segundos y después se ve tal
  cual fue. Las nuevas se graban bien desde el principio.
- Arreglado también un caso en que el texto de una repetición salía roto.

## 2026-09-15 · Vistas previas sincronizadas

- En la vitrina de SKINS y en la TIENDA **todas las fichas se mueven a la vez**:
  mismo punto del pasillo, misma Q y misma muerte, para compararlas de un
  vistazo.

## 2026-09-15 · La TIENDA y quince skins nuevas

- **TIENDA** en el cuartel y en PERFIL. Se compra con **monedas** que se
  ganan jugando: **todos empiezan con 1.500**; cada partida de al menos un
  minuto da 5, más 1 por cada 1.000 puntos (hasta 40 por partida); cada reto
  del DAILY da 20 y la semana entera, 150. Al final de la partida sale lo
  ganado.
- **Qué se vende**: 7 **emotes** (150), 10 **efectos** (250), 11
  **accesorios** (450) y 5 **skins de tienda** (1.500): CUY, LLAMA, CARRO, OSO
  y GALLETA. Las de nivel, logro y temporada no se venden.
- **Se lleva a la vez** una skin, un accesorio, un efecto y seis emotes: en
  la tienda se elige qué cara va en cada tecla del 1 al 6. Los accesorios
  solo se ven en skins con forma de Pac-Man.
- **Online se ve lo de cada uno**: el accesorio, el efecto y los emotes
  comprados. Hace falta recargar para jugar con quien ya tiene la versión
  nueva.
- **Diez extravagantes nuevas**, por logro: BOMBA, PEZ ABISAL, PIÑATA,
  TOSTADORA, GÁRGOLA, PULPO, MOMIA, PEZ GLOBO y BICÉFALO; y HOMBRE LOBO, que
  se gana jugando una noche de luna llena.
- **Cada skin nueva muere a su manera** sin cambiar de dibujo (la bomba
  explota, la galleta se come a mordiscos, la gárgola se desmorona, el pulpo
  se derrite...) y en DESATADO hace su propia Q cuando acierta.
- Las compras y las monedas viajan con tu cuenta, igual que los logros.

## 2026-09-14 · Un corte de conexión ya no acaba la partida

- **El online se reconecta solo.** Antes, un bajón de un instante del Wi-Fi
  o de los datos sacaba "CONEXIÓN PERDIDA" en el acto. Ahora el juego vuelve
  a conectar por su cuenta durante 10 segundos; mientras tanto se ve
  "esperando conexión" y la partida sigue donde estaba.
- **Lo que mandas durante el corte no se pierde**: sale en orden al volver.
- **Una conexión que parece viva pero ya no recibe nada** se detecta en unos
  4 segundos y se repara, en vez de colgar la partida.
- La desconexión definitiva pasa de 8 a 10 segundos sin datos, lo mismo que
  se insiste en reconectar.

## 2026-09-14 · La skin que cambias en la party llega a la partida

- **Cambiar de skin con la party abierta ya se nota en la partida.** El
  líder se quedaba con la skin que llevaba al crear la party, y el invitado
  tardaba unos segundos en avisar, así que si se arrancaba enseguida salía la
  vieja. Ahora el cambio se reparte en el acto, y lo mismo el color y el
  nombre.

## 2026-09-14 · Lluvia de monedas del COFRE

- Con la Q que acierta, el COFRE suelta **26 monedas** (antes 8), de tamaños
  y velocidades distintas, con brillo dorado y destellos. Salen ya fuera del
  cofre para no taparle la cara.

## 2026-09-14 · La Q que falla ya no echa fuego

- **DRAGÓN, COFRE y OVNI solo lanzan su golpe si la Q acierta.** Una Q al
  aire enseña los dientes y nada más; el dragón, además, resopla una
  bocanada de humo.
- **El humo del dragón está vivo**: volutas que salen de la nariz, suben
  ondulando, se inflan y se deshacen.
- **El dragón suena más imponente** al comer: un bufido grave, sin el
  zumbido de sierra que cansaba.
- **Con la Q el personaje ya no desaparece.** Al morder un fantasma se
  escondía durante el parón de los puntos, como en el arcade; en DESATADO
  se queda a la vista.
- **RASTRO vuelve a enseñar sus discos** en la vitrina: el reloj de la
  animación era tan grande que los arcos que giran dejaban de pintarse.

## 2026-09-14 · Las skins mueren, suenan y muerden a su manera

- **Al morir se anima tu skin**, no un Pac-Man normal: gira encogiéndose y
  estalla en chispas de tu color. La clásica sigue con la animación de
  siempre.
- **Sonidos propios al comer** para las extravagantes y DORADO: huesos que
  chocan (CALAVERA), metal (ROBOT), un "tin" de oro (DORADO), monedas
  (COFRE), un "glup" bajo el agua (TIBURÓN), soplido de fuego (DRAGÓN),
  chasquido de hojas (PLANTA), mandíbula que retumba (T-REX), un "ñam"
  (HAMBURGUESA), un "uiu" espacial (OVNI), un maullido (GATO) y un chillido
  de murciélago (VAMPIRO). En la vitrina se oyen con ESCUCHAR.
- **La Q, a su manera**: el DRAGÓN solo echa fuego con la Q (si no, humo);
  el COFRE suelta monedas a su alrededor; el OVNI solo enciende el rayo
  abductor con la Q.
- La mandíbula del TIBURÓN ya no parece pegada: el vientre blanco sigue
  de una pieza.
- Las fichas de la vitrina ya no dejan un hueco a la derecha, y la
  miniatura de PERFIL de las skins de estela (RASTRO, COMETA, SOMBRA,
  ESCUADRA) lleva su estela.

## 2026-09-13 · 26 skins nuevas y la vitrina de SKINS

- **De 6 skins a 32.** Por nivel: MOÑITO, COMETA, HOLOGRAMA, GLITCH, PRISMA,
  RASTRO y FUEGO, además de las de siempre. Por logro: CEREZA, MEDIO
  FANTASMA, CORONA, ESCUADRA y DORADO. **Extravagantes**, que dejan la forma
  de Pac-Man y comen a su manera: HAMBURGUESA, GATO, TIBURÓN, PLANTA
  CARNÍVORA, ROBOT, T-REX, OVNI, COFRE MÍMICO, DRAGÓN y CALAVERA. De
  temporada: CALABAZA, NOCHE DE BRUJAS y VAMPIRO (Halloween) y CLAUS-MAN
  (Navidad).
- **La escalera de nivel baja**: 1, 2, 4, 6, 8, 10, 12, 15, 18, 22, 26, 30 y
  34, en el orden elegido en la vitrina. Antes pedía 3 / 7 / 12 / 20 / 30 y
  solo un jugador pasaba del 30. Nadie pierde ninguna.
- **Cada skin de logro dice qué pide y cuánto te falta.** Las cifras salen de
  los contadores reales: 120 frutas, 300 fantasmas, 50 mordiscos con la Q, 5
  retos del DAILY, llegar al nivel 7, 100 partidas, 30 acompañado, 5
  cacerías, 10 Pac-Man cazados en CACERÍA, 100.000 puntos, 250 muertes,
  LEYENDA en clásico solo, MAESTRO en DESATADO, MAESTRO en escuadra y entrar
  en el top 10.
- **Lo jugado cuenta.** Las muertes no se contaban: se estiman a 2,5 por
  partida jugada, a la baja.
- **Las estelas siguen el camino** (doblan las esquinas con Pac-Man) y
  **crecen con la velocidad**: con el turbo miden el doble.
- **Vitrina de SKINS** (TU CUARTEL, o desde PERFIL): cada skin corre por un
  pasillo a tamaño de partida con lupa al lado, con su progreso y el botón
  para ponérsela. En PERFIL queda solo la puesta.
- **Aviso de SKIN NUEVA** en la partida cuando se abre una.

## 2026-09-12 · Las maestrías de dúo, trío y escuadra, mucho más alcanzables

- **El listón de equipo deja de multiplicarse por los jugadores.** Antes dúo
  pedía el doble que solo, trío el triple y escuadra el cuádruple; ahora
  **x1,25 en dúo, x1,5 en trío y x1,75 en escuadra**, en los tres mundos.
- El motivo son las marcas reales: en equipo no se hacen más puntos (el
  laberinto es el mismo), solo se aguanta más. En DESATADO las mejores eran
  110.000 en solo y 74.000 / 68.000 / 64.000 en dúo, trío y escuadra.
- TOP MUNDIAL del clásico pasa a 125.000 en dúo, 150.000 en trío y 175.000
  en escuadra (antes 200.000 / 300.000 / 400.000). En DESATADO, 218.750 /
  262.500 / 306.250.
- **Nadie pierde nada**: todos los escalones bajan. Con las marcas de hoy, el
  dúo clásico sube a LEYENDA, el trío clásico a EXPERTO, el dúo de DESATADO a
  MAESTRO y su trío y escuadra a EXPERTO.

## 2026-09-12 · F1–F4: enseñar la maestría de cualquier formato

- **`Ctrl`+`Espacio` sigue enseñando la de la partida**, y ahora **`F1`,
  `F2`, `F3` y `F4` enseñan la de SOLO, DÚO, TRÍO y ESCUADRA** del mundo que
  se esté jugando (en DESATADO, F2 es la de DESATADO · DÚO).
- **La chapa lleva una pestaña encima con el formato**, para que quien la vea
  sepa si ese TOP MUNDIAL es de dúo o de escuadra. La de SOLO sale limpia,
  sin pestaña, como siempre. Sale también en el panel
  MAESTRÍAS.
- **En móvil**, al lado de MI MAESTRÍA hay cuatro botones pequeños: SOLO · DÚO
  · TRÍO · ESC.
- Quien juegue con una pestaña vieja en la party sigue viendo la chapa, solo
  que sin pestaña.

## 2026-09-12 · DESATADO tiene sus propios escalones de maestría

- **DESATADO deja de doblar el listón y pasa a tener su propia tabla**:
  APRENDIZ 5.000, CAZADOR 15.000, EXPERTO 30.000, MAESTRO 55.000, **LEYENDA
  100.000** y TOP MUNDIAL 175.000. Antes salían de multiplicar por dos los del
  arcade (6.000 / 16.000 / 30.000 / 60.000 / 120.000 / 200.000): cifras
  heredadas, no elegidas. Sigue pidiendo más que el laberinto de 1980 —con
  poderes los puntos salen baratos— pero ahora los números son redondos.
- **El formato multiplica igual que siempre** sobre esa tabla: LEYENDA son
  100.000 en solo, 200.000 en dúo, 300.000 en trío y 400.000 en escuadra.
- **Nadie pierde nada**: todos los escalones bajan o se quedan igual, así que
  quien anduviera cerca se encuentra la insignia ya conseguida.

## 2026-09-07 · CACERÍA: todos de fantasma contra un Pac-Man de máquina

- **Modo nuevo en la portada: CACERÍA.** Es PAC-MAN VS. dado la vuelta: de uno
  a cuatro jugadores llevan cada uno un fantasma y **el Pac-Man lo lleva la
  máquina**, que come, huye y se defiende sola. Solo (llevas a Blinky y los
  otros tres son de la máquina), dos en el mismo teclado (Blinky con flechas,
  Pinky con WASD) y en party de hasta cuatro (lo enciende quien manda, como
  DESATADO).
- **Sin superpastillas.** Las cuatro esquinas son puntos normales. El poder de
  Pac-Man **llega solo cada 20 segundos y dura 6**, y se avisa **3 segundos
  antes** con un aro alrededor de él y un pitido por segundo: es el momento de
  soltar la presa y apartarse. El reloj sale arriba, donde estaba el HIGH
  SCORE (que aquí no pinta nada).
- **Tres rondas por partida.** Cada vez que lo cazas son 1000 puntos, como en
  VS. Si se queda sin vidas, ganáis (y el titular es de quien más lo cazó); si
  despeja las tres rondas, gana él. Cada ronda el poder dura un segundo más y
  llega dos antes.
- **El Pac-Man de la máquina sabe huir**: mira por dónde vienen los fantasmas,
  solo pisa casillas a las que llega antes que ellos, y cuando lo están
  cerrando deja de comer y busca sitio. No lee intenciones: cuatro que le
  cierran un pasillo por los dos lados lo pillan; uno corriendo detrás, no.
  Corre un poco más que Pac-Man (x1.1), porque sin superpastillas y con los
  cuatro fantasmas fuera desde el primer segundo, al 80% no pasaba del primer
  minuto.
- **Tres logros nuevos** (JAURÍA, LETAL, MANADA) y sus propios contadores. No
  entra en el top mundial ni hace récord, pero suma experiencia.
- **Un cazador que se va** deja su fantasma a la máquina en vez de dejarlo
  dando vueltas con el último rumbo (también en PAC-MAN VS.).
- Quien tuviera el juego abierto tiene que **recargar**: cambia la versión del
  protocolo de red.

## 2026-09-05 · Los fantasmas azules ya no se atraviesan

- **Si le pasas por encima a un fantasma azul, te lo comes.** Hasta ahora,
  bastantes veces no. El fallo estaba en que el juego dibuja a Pac-Man y a los
  fantasmas con 13 px de ancho sobre casillas de 8: **dos que están en
  casillas contiguas ya se solapan medio cuerpo en pantalla**, pero para el
  juego seguían siendo dos casillas distintas y no pasaba nada. Se veía el
  mordisco y no había mordisco.
- Midiéndolo en partida, **se perdía uno de cada diez encuentros**, y en el
  peor caso los dos llegaron a quedar **a medio píxel** el uno del otro sin
  que contara. Ahora, cero.
- Lo mismo valía para los compañeros: la regla es la misma para todos, en
  local y en línea, y **el invitado muerde con la misma vara que el anfitrión**
  para que no se le escape en su pantalla algo que el anfitrión sí le da.
- **Morir no ha cambiado nada.** Para que un fantasma te mate sigue haciendo
  falta compartir casilla, con la regla estricta del arcade de siempre. La
  manga ancha es solo para comer: arreglar los mordiscos no puede costarte una
  vida ni descuadrar un récord ya puesto.

## 2026-09-03 · ARO pasa a ser la última skin

- **ARO se gana ahora al nivel 30 y PÍXEL al 20**, al revés que hasta hoy.
  Son las dos que más se alejan del Pac-Man de siempre, y la de aro —que es
  solo el contorno— es la que más: tiene más sentido como la última.
- **La que lleves puesta no se pierde.** El juego siempre te deja seguir con
  tu skin actual aunque pida más nivel del que tienes, así que a quien ya
  jugaba con ARO no le cambia nada. Lo que sí cambia: entre el nivel 20 y el
  29 ahora se tiene PÍXEL en vez de ARO.

## 2026-09-03 · La skin PIXEL, con forma de verdad

- **El Pac-Man de bloques ahora se parece a un Pac-Man.** La idea estaba bien,
  pero el dibujo no tenía forma: la espalda no era redonda y los labios salían
  dentados. Eran tres cosas a la vez y las tres están arregladas:
  - **La rejilla va centrada.** Antes se recorría de un extremo al otro a
    pasos que no caían simétricos, así que un lado salía distinto del otro y
    la silueta no tenía eje. Ahora hay fila y columna central, y **la espalda
    se lee redonda**.
  - **Los bloques caen enteros en la rejilla de la pantalla**, y la raya que
    los separa —la que hace que se lean como píxeles sueltos, que es el estilo
    de esta skin— **se dibuja ahora a propósito**: un píxel de pantalla,
    siempre igual y limpio. Antes salía sola, de rebote, porque los bloques
    caían a medio píxel y el navegador los difuminaba: se veía, pero sucia y
    de un ancho distinto en cada bloque.
  - **La boca se come bloques enteros**, no medios píxeles, y por eso **los
    labios salen rectos**.
- De propina, los cuatro polos quedan de un píxel, así que el cuerpo se ve
  aún más redondo y **cabe en el pasillo con aire de sobra**.
- Los dientes de la Q van ahora al mismo tamaño de bloque que el cuerpo, y son
  dos por labio: con tres, la boca se llenaba de blanco y ya no se leía como
  una dentadura.

## 2026-09-03 · Los dientes del mordisco, con cualquier skin

- **La Q enseña los dientes lleves la skin que lleves** — eso no cambia: son
  el aviso de que la tecla ha entrado, y sin ellos fallar la puntería y tener
  la tecla recargando se sienten igual. Lo que cambia es **cómo se dibujan en
  las dos skins que no pintan un Pac-Man macizo**:
  - En **PIXEL** cada diente es ahora un bloque, del mismo tamaño y en la
    misma rejilla que el cuerpo. Unos triángulos suaves sobre un cuerpo de
    bloques se veían como un fallo del juego.
  - En **ARO** los dientes se apoyaban justo encima de la línea amarilla de
    la boca y se leían como un brillo, no como dientes. Ahora se meten un
    poco hacia dentro, donde hay negro con el que contrastar.

## 2026-09-03 · Las recargas se ven en segundos, y también las de tus compañeros

- **Ahora se ve cuánto falta, no solo "un poco".** Cada poder enseña **los
  segundos que le quedan** dentro de su casilla. La barra que se va llenando
  sigue ahí —dice de un vistazo si queda mucho o poco—, pero el número es lo
  que hace falta para decidir de verdad: si esperas dos segundos a la Q o
  tiras ya de la W. El contador ocupa el sitio del nombre del poder mientras
  cuenta, porque recargando quieres el número y cargada quieres saber cuál es:
  nunca hacen falta los dos a la vez.
- **Y ahora se ven de verdad: las recargas viajan en la foto de la partida.**
  Se apoyaban solo en el aviso de "he usado tal poder", y ese aviso se manda
  una vez y nadie lo confirma: el que se perdiera por el camino dejaba esa
  casilla mintiendo el resto de la partida, porque no había nada que volviera
  a mirarla. Mandarlo dos veces no arregla nada —el segundo se pierde igual—,
  así que las recargas van también dentro de la instantánea que el anfitrión
  reparte doce veces por segundo: si un aviso se cae, la foto siguiente lo
  corrige y no se nota. **Tu propia recarga solo se corrige hacia arriba**,
  para que al pulsar no se te encienda la casilla medio parpadeo mientras el
  aviso viaja.

- **Y se ven las recargas de tus compañeros.** En party sale una fila por cada
  uno, con su nombre en su color y sus cuatro poderes: la tecla si la tiene
  lista, los segundos si está recargando. Saber que al de al lado le queda el
  GRITO cambia lo que haces tú —si va a soltarlo, te guardas la Q para el modo
  azul—, y hasta hoy eso había que preguntarlo por voz o adivinarlo.
  - En el móvil las filas se ponen encima de tus botones, lejos de los
    pulgares.
  - Con dos en el mismo teclado no cambia nada: ahí los dos ya tenían su fila
    entera.

## 2026-09-02 · Paredes con esquinas de verdad, la Q que no falla de frente y los fantasmas que dejan de darse la vuelta

- **Y Pac-Man ya no se funde con la pared.** Esto no era una impresión, era
  una cuenta: **Pac-Man mide 13 píxeles de ancho y el pasillo dejaba 12**, así
  que su dibujo y el del muro compartían medio píxel por lado. Al recorrer un
  pasillo parecía que se pegaba a la pared, porque literalmente se tocaban.
  Ahora **las paredes son más estrechas** y el hueco es de 14: le queda aire a
  cada lado. Las esquinas siguen curvando igual en los muros grandes —la
  curva se calcula ahora esquina por esquina, según lo que dé de sí cada
  pared, en vez de con un tope único que las igualaba a todas por abajo—.
  Las pruebas comparan los dos números, así que ni el muro ni Pac-Man pueden
  volver a crecer hasta tocarse sin que salte un aviso.

- **Y el trazo es más delgado.** Medía un píxel de los de verdad,
  que en pantalla son tres, y por debajo de eso no se podía bajar: en la
  resolución del arcade no existe medio píxel. Ahora el laberinto se dibuja
  ya al tamaño en que se ve —y se pega punto por punto, sin estirar nada—,
  así que el trazo puede medir **dos**. El muro pesa menos, las curvas de las
  esquinas se leen mejor y el laberinto respira. La puerta de la casa va al
  mismo grosor, así que ahora continúa la línea en vez de parecer una barra
  puesta encima.
  - De paso, **las miniaturas del panel de LABERINTOS se ven mucho mejor**:
    antes se encogía el dibujo de la partida y a ese tamaño los muros se
    apagaban; ahora cada laberinto se dibuja directamente a tamaño de sello.

- **Las paredes ya no giran en escuadra.** El laberinto del arcade no tiene
  ni una esquina en ángulo recto: cada cambio de dirección va con una curva, y
  sin ella el dibujo se veía cortado a cuchillo. Ahora **todas las esquinas
  del muro son redondeadas**, las de fuera y las de dentro, en el laberinto
  clásico y en los seis alternativos. El trazo sigue siendo de un píxel y los
  muros ocupan exactamente lo mismo: cambia solo cómo doblan.

- **Las zonas sin subir vuelven a ser las cuatro del arcade.** En el Pac-Man de
  1980 hay cuatro cruces donde un fantasma **no puede girar hacia arriba**
  mientras persigue o dispersa, y por eso esos dos pasillos solo se bajan. Es
  una de las reglas que sostienen los patrones que uno se aprende de memoria,
  así que aquí tiene que estar clavada — y estaba **mal convertida**. El arcade
  las cuenta sobre la pantalla entera (36 filas) y nuestro laberinto empieza
  tres filas más abajo, las de los marcadores: había que restar **tres** y se
  restó **uno**, así que arrastrábamos cuatro casillas de más.
  - **En el laberinto clásico no se notaba** porque las cuatro sobrantes caían
    en un muro o dentro de la casa de fantasmas: no hacían nada.
  - **En el modo LABERINTOS sí.** Dos de ellas caían en pleno pasillo recto, y
    ahí un fantasma que subía se quedaba sin ninguna salida legal — arriba
    prohibido, los lados muro y dar marcha atrás no está permitido — así que
    **daba media vuelta en mitad del pasillo**. Un fantasma no se gira nunca
    salvo al cambiar de modo, de forma que aquello se veía sencillamente roto.
    Ya no pasa en ninguno de los seis laberintos.
  - Las pruebas ahora **fijan las cuatro casillas a los valores del arcade** y
    comprueban que en todos los laberintos siguen siendo un cruce con salida,
    para que no se vuelva a colar.

- **El mordisco pulsado un pelo antes ya no se pierde.** Pasaba siempre en la
  misma situación: Pac-Man y un fantasma van de cara, a toparse, pulsas Q para
  morder... y el que muere es Pac-Man. No era mala puntería. Yendo de frente
  los dos se acercan casi **2 píxeles por tick**, así que desde que el fantasma
  entra en el alcance de la Q hasta que pisa tu casilla y te mata pasan **cinco
  o seis ticks, menos de una décima de segundo** — la tercera parte de lo que
  tarda una persona en reaccionar. Se pulsaba cuando se *decidía*, con el
  fantasma a tres o cuatro casillas, la dentellada salía al aire y el fantasma
  llegaba igual.
  - **Ahora la Q pedida pronto se queda armada 0,3 s** y muerde sola en cuanto
    alguien entra a tiro. Es lo mismo que el juego ya hacía con los giros: el
    rumbo que pides espera a que el laberinto te deje girar.
  - **No alcanza más lejos.** Dos casillas siguen siendo dos casillas, a tres
    sigue sin llegar y fallar sigue sin gastar la recarga. Lo único que deja de
    exigir es puntería de milisegundo.
  - **Suena igual de inmediato.** La dentellada al aire se oye en el acto, como
    siempre; si la Q armada acierta después, es una segunda dentellada de
    verdad y suena como tal. Agotarse no suena ni se ve: el margen es puntería
    prestada, no un poder aparte.

## 2026-08-15 · Ya no se pierde la cuenta, DESATADO se juega de a dos y el fantasma responde

- **Olvidar la contraseña ya no cuesta la cuenta.** Hasta hoy no había vuelta
  atrás: el correo de la cuenta se componía por dentro, ese buzón no existe y
  el enlace de recuperación de Supabase no llegaba a ninguna parte. Con la
  cuenta se iban los cuatro récords, la experiencia, los logros y las doce
  maestrías. **Ahora al registrarte se te pide tu correo de verdad**, y
  recuperar la cuenta es lo de siempre: pides el enlace, te llega, lo abres y
  pones una contraseña nueva.
  - **Se sigue entrando con USUARIO y contraseña.** El correo no se usa para
    entrar ni sale en ninguna parte del juego: sirve para una sola cosa, que
    es devolverte la cuenta.
  - Quien ya tenía cuenta **no tiene correo todavía**: se pone desde PERFIL →
    CORREO DE RECUPERACIÓN, y el panel avisa mientras no lo tengas. Entrar,
    entras igual que siempre.
  - «HE OLVIDADO LA CONTRASEÑA» está en el propio diálogo de ENTRAR, que es
    donde se busca cuando no consigues entrar.
- **DESATADO ya se juega entre dos en el mismo teclado.** No estaba porque el
  J2 se mueve con WASD y la W era el turbo: una tecla no puede hacer dos
  cosas. Ahora cada uno tiene una fila entera en su mitad del teclado — **J1
  con las flechas y `N M , .`; J2 con WASD y `Z X C V`** — y la barra de
  poderes enseña las dos, cada una con la recarga de su dueño. En solo y en
  online no cambia nada: siguen siendo Q W E R.
- **Y también en PAC-MAN VS., porque ahora el fantasma responde.** Tampoco
  estaba, y por otro motivo: comerse de un mordisco a un fantasma que lleva
  una persona, sin que pueda hacer nada, no es una pelea. **Quien lleva
  fantasma tiene sus dos poderes**:
  - **EMBESTIDA** — x1.35 de velocidad durante 4 s. Para cerrar la distancia,
    o para salir corriendo cuando ves venir la Q.
  - **ACECHO** — 4 s translúcido y **sin la marca del jugador encima**, que es
    lo que hoy te delata desde el otro extremo del laberinto. Al que no ves
    venir no le aciertas.
- **Las habilidades ya suenan.** Los cuatro poderes eran mudos salvo por lo
  que arrastraban de rebote, y justo los dos que no tocan el marcador —turbo y
  flash— no sonaban nada, así que la tecla se sentía rota. Ahora cada uno
  tiene su sonido, incluida la dentellada al aire, que suena **distinta** a la
  que acierta: fallar la puntería y tener la tecla en recarga ya no se
  confunden. Los dos del fantasma suenan más graves, para saber de qué lado
  vino sin apartar la vista.
  - **Suenan los de todo el mundo**, no solo los tuyos: que a alguien le quede
    una habilidad menos es información de la partida, y un mordisco se oye
    venir. Los de los demás entran **al 10%**, de fondo, para que una party de
    cuatro no sean dieciséis teclas peleándose con el waka.
- **El selector de modo recuerda tu elección.** Volvía a CLÁSICO en cada
  recarga; ahora se queda donde lo dejaste.
- **Las repeticiones se comparten por enlace, también las de online.** Las
  locales caben enteras en la URL y ya funcionaban así por dentro, pero no
  había botón; las de red pesan ~12 KB por minuto de partida y no caben, así
  que **se suben y el enlace lleva solo un código** (`?rn=A3K9XQ7M`). Para
  quien lo recibe son lo mismo: abre y ve la partida. El botón COMPARTIR está
  en TUS PARTIDAS, al lado de VER.
- **El progreso del DAILY empieza de cero.** La semana en curso, la racha y la
  mejor racha se borran una vez: venían de cuando el DAILY contaba mal el día
  (iba en UTC) y eran marcas hechas con otro calendario. **Los tres logros del
  DAILY no se tocan**: eso ya está ganado.
- Se ha **retirado la tabla `reto_diario`** de Supabase, que era lo último que
  quedaba del RETO DE HOY. El juego no la tocaba desde el 14 de agosto.

- **Y las partidas de PAC-MAN VS. en el mismo teclado ya dejan repetición.**
  No la dejaban, y salían mintiendo cuando lo intentaban: el rumbo de quien
  lleva fantasma no pasaba por donde se graban las órdenes, así que al verlas
  el fantasma humano se movía por su cuenta. Ahora el rumbo del fantasma es
  una orden más y la partida se reconstruye clavada, poderes incluidos.

> Lo que **no** cambia: DESATADO sigue sin entrar en el top mundial ni en el
> récord de siempre, juegue uno o dos. Es un modo aparte y tiene sus propias
> maestrías, como LABERINTOS.

> **Aviso para quien monte esto en su propio Supabase**: el enlace de
> recuperación lo manda Supabase, y con su remitente de prueba solo salen 2
> correos por hora y no llegan a gente de fuera. Hace falta configurar un
> **servidor de correo propio** (Authentication → SMTP Settings) para que la
> recuperación funcione de verdad.

## 2026-08-15 · Cuatro arreglos: el día, el reto, los laberintos y las vidas

- **El DAILY marcaba el día equivocado.** Un viernes por la tarde ya ponía
  SÁBADO. Iba en UTC —heredado del RETO DE HOY, que sí lo necesitaba porque
  tenía clasificación mundial— y el DAILY no manda nada a ningún sitio: es
  tuyo y de tu navegador. Ahora **el día es el de tu reloj**, así que cambia a
  tu medianoche y no a las 19:00.
- **Ya no se pueden cumplir retos que no sean el de hoy.** Los siete se
  siguen viendo desde el lunes —saber lo que viene es medio motivo para
  volver—, pero solo cuenta el del día: el de ayer ya pasó y el de mañana aún
  no está. La recuperación hasta el domingo convertía el reto diario en una
  lista semanal que se despachaba el sábado.
- **Los laberintos rompían LA regla del Pac-Man original: nunca dos filas de
  comida pegadas sin muro de por medio.** Cinco de los seis tenían bandas de
  dos filas. No es cosa estética: con pasillos de una sola casilla, esquivar
  es elegir bifurcación y los patrones de los fantasmas significan algo; en un
  hueco de dos de ancho se les da la vuelta y ya. **Los seis están
  redibujados** con la plantilla del original, y ahora hay una prueba que lo
  vigila (y que comprueba de paso que el laberinto de 1980 no tiene ni un
  cuadro de 2×2, que es de donde sale la regla).
- **La dificultad podía mentir.** Decía NORMAL y la partida empezaba con
  cinco vidas. La etiqueta se guardaba aparte de los números y nadie las
  comparaba, así que en cuanto se separaban el panel se quedaba tan ancho.
  **Ahora la etiqueta se deduce de los valores**: si tienes cinco vidas, el
  panel dice PERSONALIZADA, y a quien la tuviera descuadrada se le arregla
  sola al abrir el juego.

> Ojo con una cosa que **no** es un fallo: en el marcador se dibuja **una vida
> menos de las que tienes**, porque la que estás usando no se pinta. Con
> NORMAL (tres vidas) se ven dos. Es así en el arcade de 1980 y se queda.

## 2026-08-14 · El DAILY: siete retos por semana, y ya no son un modo

- **El RETO DE HOY tenía un problema de raíz: era un modo de juego.** Una
  partida aparte, con su semilla, su intento único y su clasificación. Para
  jugarlo tenías que dejar de jugar a lo tuyo, y si ese día esa partida
  concreta no te apetecía, sencillamente no había reto.
- **Ahora hay siete retos por semana, uno por día, y se cumplen jugando a lo
  que ibas a jugar igual.** «3 fantasmas con un mismo energizante», «despeja
  un nivel sin morir», «12.000 puntos en una partida». Te salen al paso.
- **Semana con recuperación.** Los siete se ven desde el lunes; el de cada
  día se abre ese día y **se queda abierto hasta que acaba la semana**. Si el
  martes no puedes jugar, lo cumples el jueves. Se premia jugar, no estar
  presente a diario. Lo que sí caduca es la semana.
- **Cinco valen en cualquier modo y dos piden uno concreto** (DESATADO,
  LABERINTOS, party...). Los de modo son los que te asoman a lo que no sueles
  tocar; los cinco libres son el suelo, para que nunca haya una semana
  imposible para quien juega solo.
- **Cada reto cumplido da experiencia**, y llevas una **racha** de días
  seguidos cumpliendo algo. La racha cuenta días jugando, no retos: ponerte al
  día de tres el jueves es un jueves, no tres días. Y no se rompe al cambiar
  de semana.
- Está **en la portada**, encima de la elección de modo, con su barra de
  progreso; se pulsa y se ve la semana entera.
- Los siete de cada semana salen de la propia fecha, así que **son los mismos
  para todo el mundo** sin necesitar servidor, y la semana que viene son
  otros.

> **Lo que se ha ido con el modo**: la tarjeta RETO DE HOY de la portada, su
> clasificación diaria en TOP MUNDIAL y su tabla. Los **tres logros** del reto
> se quedan —CONSTANTE, PULSO FIRME y ahora SEMANA REDONDA—, y **lo que ya
> llevabas jugado no se pierde**: cada día que jugaste el reto viejo cuenta
> como un reto diario cumplido, así que quien tuviera CONSTANTE sigue
> teniéndolo.

## 2026-08-14 · Seis laberintos, y cada uno con una idea

- **Los tres laberintos alternativos eran el mismo laberinto tres veces.**
  Todos estaban hechos igual: rejillas de bloques rectangulares separadas por
  bandas abiertas de lado a lado. Eran válidos, sí, pero eligieras el que
  eligieras jugabas la misma forma con los bloques movidos de sitio.
- **Ahora son seis, y cada uno se compromete con una idea**:
  - **ANILLOS** — cuatro anillos concéntricos. Se juega dando vueltas y
    decidiendo cuándo saltar al de dentro; los saltos están contados.
  - **PANAL** — celdas de dos tamaños que se corren cada dos filas. Nunca hay
    dos cruces seguidos a la misma distancia.
  - **CATEDRAL** — naves verticales larguísimas y solo dos pasos entre ellas,
    a distinta altura en cada lado. Equivocarse de nave cuesta el largo
    entero.
  - **SERPIENTE** — pasillos de punta a punta con los huecos a contrapié:
    para bajar una fila hay que cruzar el laberinto hasta el hueco, y el
    siguiente está en la otra punta.
  - **COLMILLOS** — seis filas de dientes de una casilla, sin un mísero
    atajo. Eliges carril y te aguantas hasta el otro extremo.
  - **ESCALERA** — rellanos en diagonal y **ni una fila que cruce entera**.
    El más cerrado de los seis.
- Todos pasan las mismas comprobaciones de siempre: sin callejones (un
  fantasma que entra en uno se queda encerrado y se acabó la persecución), sin
  pastillas a las que no se llegue, simetría, energizantes en las cuatro
  esquinas y la casa de fantasmas intacta.

> Los tres de antes se han **redibujado**, no renombrado. Si tenías guardada
> una repetición online de una partida en ANILLOS, PANAL o COLMILLOS, ya no se
> puede ver: el trazado de debajo es otro y se vería a Pac-Man atravesando
> muros. El juego lo detecta y te lo dice, en vez de enseñarte un disparate.

## 2026-08-14 · DESATADO, la Q en party y una portada que impone

- **HABILIDADES pasa a llamarse DESATADO.** El nombre viejo decía lo que el
  modo *tiene* (habilidades) en vez de lo que se siente al jugarlo. Cambia el
  cartel, la portada, los logros y su ruta de maestrías; los contadores y los
  récords son los mismos de siempre, así que no se pierde nada.

- **La Q ya no te mata en party.** Era el fallo gordo: pulsabas la Q, el
  fantasma se moría... y tú también. El invitado **no mata fantasmas** —eso lo
  decide el anfitrión—, así que durante la ida y vuelta de la petición el
  fantasma seguía vivo y pegado en tu pantalla, y encima el propio mordisco te
  gira la cara hacia él: te metías dentro y tu propia detección de choques te
  mataba por haber acertado el tiro. Ahora, el fantasma que acabas de morder
  **no puede hacerte nada** hasta que llega la confirmación (tres cuartos de
  segundo, de sobra). Si el anfitrión acaba diciendo que no, el escudo se
  agota y vuelve a ser peligroso: da de menos, nunca de más.
- Y **la Q entra mucho más**. Dos cosas: media casilla más de alcance —ahora
  llega a **dos casillas justas**— y, en party, el anfitrión le **perdona
  unos píxeles** al mordisco que le piden por red. Esto último no regala
  alcance: tu posición le llega a 12 veces por segundo y sus fantasmas los
  mueve él, así que cuando ejecuta tu petición ya no están donde tú los viste.
  Ese desfase no era culpa tuya y se comía la mitad de los mordiscos.

- **Las maestrías se parten también por formato en LABERINTOS y DESATADO.**
  Eran seis rutas y ahora son **doce**: tres mundos (CLÁSICO, LABERINTOS,
  DESATADO) por cuatro formatos (SOLO, DÚO, TRÍO, ESCUADRA). Quedaba un
  agujero: un trío de laberintos entregaba las mismas insignias que jugar
  solo, cuando son tres bocas comiendo.
  - El listón lo marcan **las dos cosas a la vez**: los jugadores por el
    mundo. APRENDIZ son 3.000 en solo y 24.000 en una escuadra de DESATADO.
  - En el panel se eligen por sus **dos ejes** —arriba el mundo, debajo el
    formato— en vez de con doce pestañas seguidas.
  - **No se pierde nada de lo conseguido**: la marca que ya tuvieras en
    LABERINTOS o en DESATADO cuenta para su ruta de SOLO, que es donde casi
    todo el mundo la hizo.

- **La portada elige modo como una máquina, no como un formulario.** Antes
  eran seis tarjetas en rejilla: se veía todo de golpe, sí, pero ninguna
  pesaba más que las otras. Ahora hay **un solo recuadro grande** con el logo
  del modo a tamaño de verdad, **◀ y ▶** a los lados y los puntitos debajo
  (que también se pulsan). Se conservan los mismos iconos, la misma coletilla
  con lo que pasa ahora mismo y el mismo atajo: pulsar la tarjeta arranca.
  Con teclado, las flechas pasan de modo cuando la tarjeta está enfocada.

- **La barra de Q/W/E/R se va a donde puedes mirarla.** Estaba abajo a la
  derecha de la ventana: en un monitor grande te quedaba a media pantalla del
  laberinto, así que mirar si tienes la Q cargada te obligaba a apartar los
  ojos de la partida, que es justo lo que no te puedes permitir. Ahora va
  **pegada bajo el laberinto**, centrada y en la misma mirada que las vidas y
  las frutas. En el móvil se queda donde estaba: ahí abajo manda la cruceta.

- **Tu color se elige en PERFIL**, con tu avatar y tu skin. Estaba en
  OPCIONES · JUGADORES, entre los ajustes de la máquina, y tu color no es un
  ajuste de la máquina: es quién eres en la sala. En OPCIONES se queda solo el
  del jugador 2 local, que sí lo es.

> **Ya aplicado** en el proyecto del juego: seis columnas nuevas en
> `perfiles` (`record_lab2..4` y `record_hab2..4`). Quien monte esto en otro
> Supabase tiene que lanzar `supabase/cuentas.sql` otra vez; mientras no lo
> haga, el juego sigue funcionando y guarda lo de siempre.

## 2026-08-14 · Portada nueva: elige modo y dale a JUGAR

- **Los modos estaban repartidos por toda la pantalla**: dos arrancaban desde
  su botón, el reto abría un diálogo, los laberintos vivían escondidos entre
  los paneles del cuartel y el online tenía otro botón aparte. No había forma
  de ver de un vistazo a qué se puede jugar.
- Ahora hay **seis tarjetas iguales y un solo botón grande: JUGAR**. CLÁSICO,
  DOS JUGADORES, HABILIDADES, RETO DE HOY, LABERINTOS y ONLINE, cada una con
  su icono dibujado con los sprites del propio juego y el color de su modo.
  Eliges una —se enciende solo la elegida— y debajo te dice qué es y lo que
  conviene saber antes de entrar.
- Las tarjetas **cuentan lo que pasa ahora mismo**: si el reto de hoy ya está
  jugado (y con cuánto), o cuánta gente hay en tu party.
- Pulsar la tarjeta que ya está elegida arranca directamente, para quien lo
  tiene claro. Y las flechas del teclado recorren la rejilla, como el resto
  del menú.
- **La maestría ya no se celebra en medio de la pantalla.** Jugando solo
  salía un cartelón que cruzaba el laberinto cinco segundos justo por encima
  de la casa de los fantasmas: tapaba la partida en el momento en que acabas
  de hacer tu mejor marca y estás a punto de perderla. Ahora va arriba y
  fuera del laberinto siempre, en la misma banda que los logros.
- Y **los logros por modo ya respetan lo que jugaste antes**. Nacían a cero,
  así que quien llevaba cien partidas veía "JUEGA 50 PARTIDAS EN CLÁSICO ·
  0/50". Lo de antes solo existe en los contadores globales, que no dicen de
  qué modo era, así que se reparte con lo que se puede demostrar: **el
  clásico se lleva lo global** (es el modo por defecto y el grueso de
  cualquier historial), **party solo si tienes récord de dúo, trío o
  escuadra** —la prueba de que jugaste acompañado— y de los demás no se
  inventa nada. El panel lo dice en su cabecera.

## 2026-08-14 · La Q ya no falla, y laberintos y habilidades tienen maestría propia

- **El mordisco (Q) fallaba a cada rato sin motivo visible.** El alcance se
  medía **contando casillas**, y dos cosas pegadas en pantalla pueden caer en
  casillas que no son vecinas: Pac-Man y el fantasma a **nueve píxeles** —los
  sprites casi solapados— y la Q no entraba, porque cada uno estaba en el
  borde opuesto de su casilla. Morder dependía de en qué punto del recorrido
  te pillara, que es justo lo que hace que un botón se sienta roto.
  **Ahora se mide en píxeles**: lo que se ve pegado, se muerde. Alcance de
  casilla y media, igual siempre y en las cuatro direcciones.
- Y si muerdes al aire, **se ve la dentellada**. Antes, fallar la puntería y
  tener la tecla en recarga se sentían igual —no pasaba nada—, así que la Q
  parecía rota aunque funcionase. Morder al aire no gasta recarga.
- **LABERINTOS y HABILIDADES tienen ya su propia ruta de maestrías**, con su
  propio récord. Son seis rutas: las cuatro de siempre (solo, dúo, trío y
  escuadra) y estas dos.
  - Esto tapa un agujero de antes: una partida en **otro laberinto escribía
    en el récord de 1 jugador**, o sea que un trazado más cómodo entregaba
    maestrías del laberinto de 1980 (y las subía a tu cuenta). Ya no.
  - La ruta de **HABILIDADES pide el doble** en cada escalón: con poderes los
    puntos son más baratos, y sin ese peaje se acababa en dos tardes.
  - Los dos récords **viajan a tu cuenta** como los otros cuatro, así que las
    maestrías nuevas te siguen de un aparato a otro.

> **Ya aplicado** en el proyecto del juego (`perfiles.record_lab` y
> `record_hab`). Quien monte esto en otro Supabase tiene que lanzar
> `supabase/cuentas.sql` otra vez. Si no lo hace no se rompe nada: el juego
> detecta que faltan las columnas y sigue subiendo lo de siempre.
>
> Lo que ya estuviera en tu récord de 1 jugador **se queda como está**: no hay
> forma de saber qué parte vino de un laberinto alternativo.

## 2026-08-14 · Logros de cada modo

- Hasta ahora los 15 logros valían jugando a lo que fuera, así que el juego
  no te daba ni un motivo para probar los modos que no sueles tocar. Ahora
  hay **18 logros más, tres por modo**: CLÁSICO, PARTY, RETO DE HOY,
  LABERINTOS, PAC-MAN VS. y HABILIDADES. Son 33 en total.
- **Salen todos en la misma lista** (PERFIL → LOGROS), y cada uno dice
  delante en qué modo hay que conseguirlo, con el color de ese modo. Los de
  siempre se quedan como estaban y ponen `CUALQUIER MODO`.
- Algunos son cosas que antes no se contaban: los fantasmas que te comes **a
  mordiscos**, los **muros que atraviesas con el flash** y los **Pac-Man que
  cazas** llevando un fantasma.
- Una partida cuenta **para su formato y para su modo a la vez**: una party
  de habilidades avanza los dos. Lo que no se mezcla son los modos entre sí
  —el reto y los laberintos no cuentan como clásico—, porque cada uno tiene
  su propio logro y su propia descripción.
- Lo que ya tenías **no se toca**: los contadores de siempre siguen donde
  estaban y los nuevos empiezan de cero.

> De paso se arregló algo que llevaba ahí desde el online: **al invitado no
> se le contaban los fantasmas que se comía**. Su panel de final decía 0 y
> los logros de cazar no le avanzaban jugando de invitado. Ahora se le
> apuntan cuando el anfitrión confirma la comida.

## 2026-08-14 · HABILIDADES: cuatro poderes en Q, W, E y R

- Modo nuevo, **aparte del de siempre** (como LABERINTOS): el laberinto de
  1980 con cuatro poderes, cada uno con su tecla y su recarga.
  - **Q · MORDISCO** (16 s): te comes de un bocado al fantasma que tengas a
    una casilla, **mires hacia donde mires**, y Pac-Man se gira hacia él.
    Le salen dientes.
  - **W · TURBO** (24 s): x1.5 de velocidad durante 5 s, echando chispas.
  - **E · FLASH** (32 s): tres casillas **atravesando muros** hacia **la
    última flecha que pulses**, mire Pac-Man hacia donde mire: si vas por un
    pasillo de lado y pulsas arriba, te subes atravesando ese muro. Se come
    los puntos y superpastillas del camino y te quedas translúcido al
    aterrizar.
  - **R · GRITO** (60 s): los cuatro fantasmas se asustan 6 s sin haber
    tocado una superpastilla. Es la definitiva: grita, W para alcanzarlos y
    Q para rematar.

  Las recargas son largas a propósito: son cuatro habilidades, y con
  recargas cortas siempre tendrías una a mano y el laberinto dejaría de
  importar. Así hay que elegir cuál gastas.
- Se juega **solo y en party**. En la party lo enciende quien manda y vale
  para todo el grupo —media party con poderes no sería una partida—, y se ve
  en la sala antes de empezar, que enterarse al arrancar sería una encerrona.
- **Aquí se mueve solo con las flechas.** La W es el turbo y una tecla no
  puede hacer dos cosas. Por eso el modo **no está en dos jugadores en el
  mismo teclado** (el J2 se quedaría sin controles) ni en PAC-MAN VS.
  (matar de un toque a un fantasma que lleva una persona no es pelear).
- **No entra en el top mundial, ni hace récord.** No es solo por la tabla: el
  récord de cada formato viaja a tu cuenta y de él salen las maestrías, así
  que una marca hecha a mordiscos daría una insignia que no dice la verdad.
  **La experiencia y los logros sí cuentan**, que son tuyos.
- Dos detalles que se notan al jugar: **la Q y la E no se gastan en balde**
  (sin nadie a tiro, o de cara al borde, no salen y no empiezan a recargar), y
  **fuera del modo azul cada mordisco vale lo mismo** — la escalera de
  200-400-800-1600 es de la superpastilla, y encadenarla a golpe de tecla
  convertía la partida en puntos regalados.
- Las **repeticiones funcionan igual**: una habilidad es una entrada más, como
  un giro, así que una partida de este modo se reconstruye clavada y se puede
  compartir por enlace.

> Sube `CFG.NET.PROTO` a **7**: quien tenga una pestaña vieja abierta no podrá
> entrar en una party hasta recargar.

## 2026-08-12 · El reto es de verdad uno al día, y TUS PARTIDAS te sigue

- El **un intento al día** lo decidía tu navegador. Bastaba con jugar el reto
  en el PC y otra vez en el móvil para mandar la mejor de las dos: para una
  clasificación que presume de ser *la misma partida para todo el mundo*, eso
  la vaciaba por dentro.
- Ahora **el hueco del día lo guarda el servidor**: una marca por nombre y
  día, y la segunda la rechaza la base de datos. Y para no gastarte una
  partida en balde, el juego **pregunta antes de empezar**: si ya lo jugaste
  en otro aparato, te lo dice y te enseña tu marca en vez de dejarte jugar.
- De regalo, **tu nombre es tuyo**: si tienes cuenta, nadie puede firmar el
  reto con tu nombre (que ahora, con un solo hueco, sería dejarte sin reto).
  Los nombres sin cuenta siguen abiertos, como siempre.
- **TUS PARTIDAS deja de ser de este navegador.** Con cuenta se traen también
  las que quedaron en el top mundial, incluidas las de la party en las que
  eras invitado, así que el historial te sigue del ordenador al móvil. Lo de
  aquí manda cuando una partida está en los dos sitios: es la que tiene tus
  puntos y el botón `VER`.
- Y una que llevaba tiempo: una partida de **trío o escuadra** se apuntaba en
  el historial como si fuera individual, así que no encontraba su repetición.
  Ahora se apunta con los que erais.

> **Ya aplicado** en el proyecto del juego. Quien monte esto en otro Supabase
> (o venga de una versión anterior) tiene que **lanzar `supabase/reto.sql`**
> otra vez: deja una marca por nombre y día —la mejor, que es la que la
> clasificación ya enseñaba— y retira el freno viejo de tres envíos.

## 2026-08-06 · Las partidas online también se graban

- Hasta ahora la repetición solo existía **jugando solo o dos en el mismo
  teclado**, que son justo las partidas que menos apetece enseñar. Las de la
  party —las divertidas— no se grababan.
- El motivo era de fondo: una repetición local son **las teclas**, y el juego
  reconstruye la partida entera con ellas porque es determinista. Online no
  vale: la partida la simula el anfitrión con las **posiciones** que le llegan
  de cada uno, así que repetir las teclas de nadie reconstruye nada.
- Lo que sí hay online es un flujo que ya lo cuenta todo: **lo que el
  anfitrión reparte** doce veces por segundo. Ahora se graba eso, y al verla
  el juego **se pone de espectador de un archivo** en vez de una sala — el
  mismo camino de siempre para mirar la partida de un amigo.
- Se ven desde **TOP MUNDIAL → TUS PARTIDAS**, con el mismo botón `VER` y los
  mismos controles (pausa, x2, empezar otra vez, salir).
- **Las graba quien hace de anfitrión** (es el único que tiene la partida
  entera), y pesan bastante más que las locales: se guardan **las dos
  últimas** y, a diferencia de las locales, **no caben en un enlace**.

## 2026-08-06 · Trío y escuadra entran en el TOP MUNDIAL

- Hasta ahora, una partida de **tres o cuatro** se jugaba… y se quedaba en tu
  navegador. El envío la cortaba (`if (playerCount > 2) return`) y la tabla
  solo admitía 1 y 2 jugadores. Hacíais 80.000 puntos en escuadra y no lo veía
  nadie más que vosotros.
- Ahora hay **una clasificación por formato**: INDIVIDUAL · DÚO · **TRÍO** ·
  **ESCUADRA**, cada una con su tabla, su temporada y su histórico, igual que
  ya tenían su récord y sus maestrías.
- **Entra el equipo entero**: los cuatro nombres viajan con la partida y la
  clasificación agrupa por equipo. Si cambia uno, es otro equipo. Y sigue
  haciendo falta que **todos** tengan nombre de verdad: sin nombre no hay
  récord.
- **El portero cuenta con vosotros**: el techo de puntos no cambia (un nivel
  tiene las mismas pastillas, fantasmas y frutas jueguen uno o cuatro), pero
  los suelos de tiempo **se reparten entre los que juegan**. Cuatro bocas
  despejan el nivel en la cuarta parte de tiempo; sin esto, una escuadra
  jugada de verdad se caía con un TIEMPO IMPOSIBLE.

### En PAC-MAN VS., cada cazador tiene su marcador

- Se puede llevar **más de un fantasma** en la misma partida, pero los puntos
  de caza iban todos al mismo saco: con dos cazadores no se sabía quién había
  hecho qué, y el nivel de jugador les daba lo mismo a los dos.
- Ahora **cobra el que caza**, en su propio marcador. El final de la ronda los
  lista a todos con lo suyo y el titular se lo lleva el que más ha cazado.

## 2026-08-05 · Llevar el fantasma se parece por fin a llevarlo, y las maestrías se ganan por formato

### El fantasma obedece la tecla que acabas de pulsar

- Los fantasmas de la máquina **piensan el giro al entrar en la casilla**, una
  regla del arcade de 1980 que no se toca. Pero al fantasma de un jugador eso
  le comía **la media casilla anterior al cruce**: pulsabas justo al llegar,
  no se miraba, el fantasma **se pasaba el cruce de largo** y encima el rumbo
  pedido se quedaba puesto y te giraba dos cruces más allá, tú sin saber por
  qué. Así no hay quien lo lleve.
- Ahora, **mientras lo lleva un jugador**, vale hasta el último momento: toda
  la casilla hasta el centro, que es justo el margen que tiene Pac-Man. A los
  cuatro de la máquina no les cambia nada.
- De paso se nota en la party: el anfitrión aplica el rumbo que llega por red
  **en el cruce al que apuntabas**, no en el siguiente, así que hay menos
  correcciones de las que te devolvían al pasillo de antes.

### Las maestrías dejan de tapar la partida de los demás

- El cartel de maestría cruzaba el centro de la pantalla **cinco segundos**.
  Jugando solo da igual; en una party es taparle el laberinto a gente que está
  jugando por una medalla que además no es suya.
- Con **más de un jugador** se celebra en una **banda estrecha arriba del
  todo**, fuera del laberinto, como los logros. Jugando solo se queda el
  cartelón de siempre.
- Si caen un logro y una maestría a la vez, **se turnan**: comparten esa banda
  y ninguna se pisa ni se queda a medias.

### Solo se celebra lo que no tenías

- **Una maestría ya conseguida no vuelve a salir.** Se estaba celebrando en
  cada partida al cruzar el escalón, así que quien las tenía casi todas veía
  el cartel una y otra vez por algo que ya había hecho hace meses.

### Cuatro ligas de maestrías: solo, dúo, trío y escuadra

- Cada formato pasa a tener **sus propias maestrías y su propio récord**. Lo
  que consigues con tres no cuenta con dos, ni al revés: son cuatro ligas
  aparte, con sus cuatro pestañas en el panel (**EN SOLO · EN DÚO · EN TRÍO ·
  EN ESCUADRA**).
- Y cada una **pide más puntos cuanta más gente juega**: el escalón de siempre
  multiplicado por los jugadores. APRENDIZ son 3.000 en solo, 6.000 en dúo,
  9.000 en trío y 12.000 en escuadra; TOP MUNDIAL, 400.000 en escuadra. El
  marcador de un equipo **es de todos**, y con cuatro se llega al mismo número
  con mucho menos mérito de cada uno: cuatro veces las vidas, cuatro bocas
  comiendo y cuatro fantasmas por energizante.
- **El récord también se guarda por separado.** Antes cualquier partida de
  más de uno escribía en el mismo sitio, así que una de escuadra te pisaba el
  récord de dúo. Ahora el **HIGH SCORE de la partida es el de su formato**: en
  trío compites contra tu mejor marca de trío.
- **No se le quita a nadie lo que ya tenía**: el récord de equipo que hubiera
  se queda donde estaba, en **DÚO**, con sus maestrías. Trío y escuadra
  empiezan de cero porque antes no existían.
- **Los cuatro récords van en tu cuenta**, no en el navegador: entras desde el
  móvil y están tus maestrías de trío y de escuadra tal cual las dejaste. Las
  insignias no se guardan en ninguna lista —cada ruta se deduce del récord de
  su formato—, así que llevándose los récords se llevan las maestrías.
  - **Hay que correr `supabase/cuentas.sql` otra vez** (SQL Editor → Run): la
    tabla de perfiles se queda con `record3` y `record4`. El archivo se puede
    lanzar las veces que haga falta.
  - Y **si no se corre, el juego no se rompe**: si el servidor todavía no
    tiene esas dos columnas, se guarda lo de siempre y se vuelve a intentar
    con todo en la siguiente sesión. Antes preferimos guardar de menos que no
    guardar nada.
- En el perfil de un amigo salen también **sus récords de trío y escuadra**,
  si ha jugado alguna.

## 2026-08-05 · El fantasma que nadie lleva vuelve a llevarlo la máquina

- Si elegías fantasma y luego **nadie lo tocaba** —empezabas solo, o el otro
  no llegaba a pulsar—, el fantasma se quedaba **dando vueltas por el
  laberinto sin perseguir a nadie**. Parecía un juego roto, y encima quitaba
  a un perseguidor de la partida.
- Ahora, **hasta la primera tecla lo lleva la máquina**, como si fuera uno de
  los cuatro de siempre. En cuanto su jugador pulsa una vez, es suyo para el
  resto de la partida.

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

## 2026-08-05 · PAC-MAN VS.: uno de la party lleva un fantasma

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

## 2026-08-05 · Cada maestría se celebra según lo que cuesta

- Las seis se celebraban **exactamente igual**, así que llegar a TOP MUNDIAL
  lucía lo mismo que sacar APRENDIZ. Ahora **cada escalón añade pompa encima
  del anterior**, sin quitar nada de lo de abajo:
  - **APRENDIZ**: la medalla sube recta y la chapa se despliega. Y ya.
  - **CAZADOR**: la medalla **gira** al subir y **salta un chispazo** al
    plantarse.
  - **EXPERTO**: doble giro, el **destello** que recorre la medalla (lo que
    tenían todas hasta ahora) y, a partir de aquí, **la chapa cambia de
    forma**: se le cortan las esquinas.
  - **MAESTRO**: **hexágono** con una punta a cada lado, **onda expansiva**,
    un segundo marco que respira y **chispas cayendo** de la chapa.
  - **LEYENDA**: la medalla se monta en un **escudo** del que sale la cinta,
    un **banderín** con cola de golondrina; **rayos girando** por detrás,
    **estrellas en órbita** y el nombre **escribiéndose letra a letra**.
  - **TOP MUNDIAL**: el mismo escudo, pero **más grande, con doble filo y
    coronado**, y la cinta con la **cola dentada**; **fogonazo** blanco al
    plantarse, más de todo y un brillo que recorre el nombre.
- Vale igual en partida (`Ctrl`+`Espacio`), en online —viaja el id de la
  maestría, así que cada extremo sabe qué escalón es— y en el panel.

## 2026-08-05 · MAESTRÍAS: la lista a un lado y la elegida en grande al otro

- **Vuelve la lista de toda la vida**, ahora a la izquierda, y a la derecha se
  ve **en grande la maestría elegida**: la chapa se celebra igual que en
  partida y, al acabar, la medalla se queda puesta con su nombre y su estado
  debajo (TU MAESTRÍA, CONSEGUIDA o lo que falta para conseguirla).
- **Fuera el botón VER**: la fila entera es el botón, se pulsa la maestría y
  ya se ve. Al ser un botón de verdad, las flechas del teclado la alcanzan
  sola y se marca en amarillo la que está puesta.
- **Al entrar, la tuya**: sale de entrada la más alta que tengas en esa ruta
  (o la primera por conseguir si aún no hay ninguna) y se celebra sola.
- De paso se va **el hueco vertical** que quedaba entre las pestañas y la
  lista: el lienzo reservaba su sitio siempre y ahora vive en su ficha, al
  lado. El lienzo se pinta a **triple escala** y sin la franja negra de arriba
  que no usaba nadie. En pantalla estrecha, la elegida va arriba y la lista
  debajo.

## 2026-08-05 · Amigos como fichas, tu skin al perfil y OPCIONES con pestañas

- **La lista de amigos ya no es una barra de herramientas**: cada uno es una
  ficha con **su avatar** (el de su cuenta), su nombre y un botón OPCIONES que
  despliega qué hacer con él —ver perfil, ver partida, invitar, quitar—. Los
  avatares se piden todos en una sola petición.
- **Tu skin se elige en PERFIL**, junto a tu avatar, que es donde pega: es
  tan tuya como él. En OPCIONES se queda tu color y el aspecto del jugador 2
  local, que ese no es de nadie en concreto.
- **Vuelven las pestañas de OPCIONES**: enseñarlo todo de golpe se veía
  desordenado. Lo que se queda del cambio anterior es que las secciones de la
  pestaña abierta se reparten en columnas en pantalla ancha, en vez de
  apilarse por el centro. PERFIL hace lo mismo.

## 2026-08-05 · La portada y OPCIONES dejan de estar aplastadas en el medio

- **Los menús ya no viven dentro del lienzo.** Vivían dentro de la caja del
  juego, que en un monitor de 1920 mide 784 px: todo caía en una columna
  estrecha con 570 px de negro muerto a cada lado. Ahora ocupan la ventana
  entera. El corte está en 601 px —no en 1000— porque entre medias era donde
  peor estaba: el lienzo pequeño y el contenido sin caber.
- **Portada de recreativa**: PAC-MAN a lo ancho con su raya azul de lado a
  lado, y debajo tres columnas —EL REPARTO y los CONTROLES a la izquierda, lo
  de jugar enmarcado en el centro y TU CUARTEL (top mundial, perfil,
  maestrías, amigos y opciones) a la derecha—. Los tres renglones de ayuda
  que cruzaban la pantalla se han recogido en su columna.
- **OPCIONES sin pestañas en PC**: caben las cuatro secciones a la vez, cada
  una en su ficha, repartidas en dos columnas. En pantalla estrecha siguen
  las pestañas de siempre.
- **Fondo negro de verdad detrás de los menús**: el laberinto se colaba entre
  los textos y era media suciedad. Los diálogos de la partida (pausa,
  rendición, GAME OVER) siguen con su velo fino, que ahí sí interesa ver el
  laberinto por detrás.
- **Maestrías, logros y amigos, a dos columnas** en pantalla ancha, y el top
  mundial más ancho.

## 2026-08-05 · La barra de desplazamiento, del mismo mundo que el juego

- Cuando un panel no cabe en la pantalla hay que desplazarlo, y ahí salía la
  **barra gris del sistema**, con sus flechitas y sus bordes redondeados, en
  medio del marco del juego. Ahora es **cuadrada, negra y azul** como las
  paredes del laberinto, y se pone amarilla al agarrarla.

## 2026-08-05 · Ver la partida de un amigo (juegue como juegue) y su perfil

- **Ya se puede ver la partida de un amigo aunque juegue en local**, solo o
  con otro en el mismo teclado. Antes solo se podía si estaba en una party,
  porque hacía falta una sala; ahora, al empezar una partida sin red, el
  juego abre por su cuenta un canal **solo de salida** con un código al azar y
  lo reparte a quien pregunte por ti. La partida no depende de él para nada:
  si falla, se cierra y a seguir jugando.
- **Y además funcionaba mal para todos**: al abrir la partida de otro se
  borraban los propios enganches que se acababan de poner, así que no llegaba
  nunca nada y se quedaba en "ENTRANDO A VER A...". Arreglado.
- **Los logros ya no tapan la partida**: la banda salía cruzando el centro de
  la pantalla, justo por la casa de los fantasmas. Ahora sale arriba del todo,
  sobre el marcador, fuera del laberinto.
- **Perfil de un amigo**: desde AMIGOS, el botón PERFIL enseña su avatar, su
  nivel con la barra, su experiencia, sus récords (solo, dúo y el nivel 1 más
  rápido), fantasmas comidos, partidas y hasta dónde ha llegado, más sus 15
  logros con la barra de progreso de cada uno.
- **La lista de amigos ya no parpadea**: pedía la lista, la respuesta volvía a
  refrescar, y eso volvía a pedirla... sin parar. Los botones se rehacían
  decenas de veces por segundo y a veces se comían el clic. Ahora se pide una
  vez y solo se repinta si la lista ha cambiado de verdad. De paso, el nombre
  va en su línea y los botones debajo de dos en dos, que los cuatro seguidos
  no cabían.
- **La skin OJOS, por fin bien**: el ojo quedaba tan pegado a la boca que, con
  la boca abierta del todo, parte del blanco caía dentro del hueco y parecía
  flotar. Se ha subido a la frente y echado un poco hacia atrás.

## 2026-08-04 · Emotes con vida, resumen al acabar y otro orden de skins

- **Los seis emotes se mueven**, cada uno como pide su emoción: la risa
  rebota y abre la boca, al que llora le caen las lágrimas por las mejillas,
  el enfadado tiembla, se pone rojo y echa humo por las orejas, el asustado
  tirita con las pupilas disparadas y una gota de sudor frío, el guiño abre
  el ojo de vez en cuando con un chispazo y los corazones laten mientras se
  le escapan otros hacia arriba. El globo también flota, y lo que se anima no
  se sale de él. En la barra de EMOTES las caras se mueven igual, así se
  elige por lo que hace el emote y no por una foto quieta.
- **Resumen al terminar la partida**: cuando acaban las celebraciones (los
  logros que acaban de caer y la subida de nivel), el panel de GAME OVER
  enseña lo que te llevas: los puntos, la experiencia ganada con la barra del
  nivel de jugador —y si has subido, a qué nivel— y la lista de logros
  conseguidos en esa partida. Antes el panel salía de golpe y tapaba justo
  las animaciones que celebraban todo eso.
- **Otro orden para ganarse las skins**: CLÁSICO, SOMBRA (nivel 3), OJOS (7),
  NEÓN (12), ARO (20) y PÍXEL (30).

## 2026-08-04 · Nombres más largos

- **Los nombres pasan de 8 a 12 letras**, en todas partes: portada, OPCIONES,
  usuario de la cuenta, amigos y ranking mundial. Los campos de texto se han
  ensanchado para que quepan de una pieza.
- **El marcador encoge la letra en vez de recortar el nombre**: en la línea de
  equipo cada jugador tiene su hueco (la mitad con dos, un cuarto con cuatro)
  y el nombre se ajusta a él hasta 4 px, que se sigue leyendo. Igual con el
  nombre que sustituye a "1UP", con el que sale sobre cada Pac-Man en el
  "¡LISTO!" y con las líneas del chat en partida.
- En el servidor se han subido los límites que validaban 8 letras
  (`ranking`, `perfiles` y `amigos`), así que el récord mundial y las cuentas
  aceptan los nombres nuevos.

## 2026-08-04 · Logros, perfil con avatar, cuentas y skins que se ganan

- **Sistema de logros**: 15, desde el DOBLETE (dos fantasmas con el mismo
  energizante) hasta AZOTE (1000 fantasmas), pasando por despejar niveles sin
  morir, frutas, partidas jugadas, llegar lejos y hacer el nivel 1 en menos de
  1:30. Al conseguir uno sale una banda con su estrella durante la partida, y
  en PERFIL están todos con su barra de progreso. No se guarda "conseguido
  sí/no" sino **contadores**, así que se pueden recalcular en cualquier momento
  (por ejemplo al entrar en una cuenta) sin depender de cuándo pasó cada cosa.
- **Las skins se ganan subiendo de nivel**: OJOS en el 3, NEÓN en el 7, ARO en
  el 12, PÍXEL en el 20 y SOMBRA en el 30. Las que aún no tienes salen
  apagadas en OPCIONES con el nivel que piden. **La que ya llevabas puesta no
  se te quita nunca**, aunque el requisito la dejara fuera.
- **Vista PERFIL**: tu avatar, tu nombre, tu nivel con la barra, y un resumen
  de logros, maestría y récord. Hay **16 avatares** dibujados por código
  reaprovechando los sprites del juego: Pac-Man y sus caras, los cuatro
  fantasmas, el asustado, los ojos, frutas y la medalla.
- **Nombre al azar de invitado**: un botón en PERFIL sortea nombres tipo
  PACMAN, ZIGZAG o NEORUN, para no tener que inventarse uno.
- **Cuentas con usuario y contraseña** para quien quiera llevarse sus logros,
  maestrías, récords y amigos a cualquier sitio. Solo se pide usuario y
  contraseña: no hay que dar ningún correo. El usuario **es** tu nombre en el
  juego, así no hay dos nombres que cuadrar. Al entrar, lo de la nube y lo de
  este navegador **se funden quedándose con lo mejor de cada lado**: nunca se
  pierde lo jugado de invitado ni lo jugado en otro ordenador.
- **Los amigos pasan a ir con la cuenta**: de invitado se juega igual, pero la
  lista de amigos necesita cuenta (así la tienes en cualquier sitio, y no
  atada a un navegador).
- **Arreglada la skin OJOS**: el ojo se colocaba con una perpendicular que
  cambia de signo entre ir a la derecha y a la izquierda, así que saltaba de
  la frente a la barbilla — y en la miniatura de OPCIONES, que mira a la
  derecha, salía justo debajo. Ahora va siempre en la frente.
- **Pruebas sin navegador**: `node pruebas-node.js` corre las mismas 80
  pruebas de `tests.html` con un DOM de mentira, y sale con error si falla
  alguna.

## 2026-08-04 · Los patrones del arcade vuelven a funcionar

- **Pac-Man iba un 10% lento por los pasillos con puntos**, y eso solo ya
  rompía cualquier patrón memorizado. El original le quita **un fotograma
  por punto comido** y corre a su velocidad de siempre; aquí se le aplicaba
  además la columna «Pac-Man (dots)» de las tablas, que es *esa misma cosa*
  contada de otra manera. Se frenaba dos veces. Ahora cruza un pasillo de
  puntos al 71% del nivel 1, clavado a la máquina.
- **El azar deja de ser azar**: los fantasmas azules huían con `Math.random`,
  así que la misma jugada salía distinta cada vez. Ahora va con un contador
  que se reinicia con cada nivel, como en el arcade: el mismo nivel se juega
  siempre igual y hay patrón que memorizar.
- **Los fantasmas piensan una casilla antes**: al entrar en una casilla ya
  deciden por dónde saldrán, en vez de decidirlo al llegar al centro. Miran a
  Pac-Man medio paso antes del cruce, que es de donde salen esos giros que
  parecen equivocados y por los que los patrones funcionan.
- **La vuelta forzada es inmediata**: al cambiar de dispersión a persecución
  (o al comerte un energizante) los fantasmas se dan la vuelta donde estén,
  sin terminar de llegar al centro de la casilla.
- **Cruzarse de frente con un fantasma vuelve a dejar pasar**: la colisión
  detectaba el intercambio de casillas en el mismo fotograma, que era una
  corrección deliberada de un fallo del arcade. Pero los patrones del original
  cuentan con ese fallo, así que se quita: ahora colisionar es **compartir
  casilla y nada más**, exactamente como la máquina.
- **El laberinto es el del arcade también por fuera**: a los lados de la casa
  de fantasmas quedaban huecos en el muro exterior, y el contorno se dibujaba
  con aristas donde el original tiene pared maciza. Los 244 puntos y todos
  los pasillos siguen igual.

## 2026-08-04 · Récord de velocidad, ver partidas sin salirse y arreglos de menús

- **Nuevo récord mundial: el nivel 1 más rápido.** Tercera pestaña en TOP
  MUNDIAL con quién despeja el primer nivel en menos tiempo, en mm:ss.cc. La
  marca se manda **al despejarlo**, no al acabar la partida, así que cuenta
  aunque después te maten o te salgas. Solo vale a un jugador, sin red y con
  los ajustes de siempre: con los fantasmas frenados o Pac-Man acelerado no
  sería comparable con la de nadie. Tu tiempo sale también en el GAME OVER.
- **Ver la partida de un amigo ya no obliga a dejar tu party**: se mira por
  un canal aparte, así que el grupo sigue en pie mientras tanto. Si los tuyos
  arrancan una partida, dejas de mirar y entras con ellos.
- **La maestría del panel se ve como en la partida**: MAESTRÍAS enseñaba un
  cartel grande que no era lo que sale jugando. Ahora `VER` reproduce la
  misma chapa de `Ctrl`+`Espacio`, con tu Pac-Man debajo: la medalla sube
  girando, la chapa se despliega con un chispazo y al final se encoge de
  vuelta.
- **Los avisos encima de un menú ya tapan lo de detrás**: el velo fino de los
  diálogos está pensado para dejar ver el laberinto, pero sobre un menú lleno
  de botones se leían las dos cosas a la vez y no se entendía nada (el aviso
  de subir de nivel al volver al menú, por ejemplo).

## 2026-08-04 · Partys persistentes, hasta 4 jugadores, invitaciones y ver partidas

- **Partys persistentes**: se entra una vez con el código y el grupo **sigue
  junto** al volver al menú o al acabar la partida. El líder puede echar otra
  sin volver a pasar el código. El botón del menú avisa con `PARTY (n/4)`.
  Dentro se ve el código, el enlace, la lista de miembros con su color, y hay
  botones para invitar, empezar, volver al menú (sin salirse) y salir.
- **Invitar a un amigo por su nombre**: cada jugador escucha un canal propio,
  así que se puede invitar a alguien aunque no esté en la party. Al invitado
  le sale un aviso para entrar o dejarlo. También hay botón `INVITAR` en cada
  fila de AMIGOS.
- **Partidas de 3 y 4 jugadores**: cada uno con su salida (los dos primeros
  abajo, los otros dos arriba), su color y su índice. Los colores repetidos
  se reparten solos para poder distinguirse.
- **Ver la partida de un amigo**: desde AMIGOS, `VER PARTIDA` le pregunta
  dónde está jugando y entra solo a mirar: sin Pac-Man propio, sin chat, sin
  emotes y sin rendirse. Lo que se ve no cuenta como partida propia (ni
  historial, ni experiencia, ni ranking). Como el canal de partida es uno,
  para mirar hay que dejar la party propia, y se avisa antes.
- **Con más de dos, la caída de uno ya no corta la partida**: quien se va o
  se queda sin conexión pasa a espectador y los demás siguen. Cada jugador
  tiene ahora su propio vigilante: antes, con el general, uno mudo se
  quedaba clavado mientras los otros hablaban.
- **La maestría vuelve a verse**: el cartel salía **una sola vez en la vida**,
  así que quien ya tenía casi todas no lo volvía a ver nunca. Ahora se
  celebra cada vez que se cruza un escalón dentro de la partida (una vez por
  partida y escalón) y el texto distingue si es nueva o ya conseguida.
  Además, cada fila del panel MAESTRÍAS tiene `VER` para verlo entero.
- **La experiencia ya no se pierde si te sales a medias**: solo se sumaba al
  llegar al GAME OVER, así que salir por el menú de pausa, reiniciar con `R`
  o rendirse tiraba todo lo jugado. Ahora los puntos cuentan **acabe como
  acabe la partida** (una sola vez, eso sí). Recordatorio de cómo funciona:
  el nivel mide **cuánto juegas**, no si haces récord — 500 puntos suman 500,
  aunque no batas nada. Si subes de nivel justo al salir, el menú te lo
  celebra con un aviso.
- **La chapa de maestría en partida también se anima** (`Ctrl+Espacio` o el
  botón MI MAESTRÍA), con una animación distinta a la del panel: la medalla
  sube girando desde encima de tu Pac-Man, la chapa se despliega hacia su
  derecha con un chispazo, la medalla destella mientras se mantiene y al
  final todo se encoge de vuelta hacia ti.
- **Corregido el retraso tras cada despliegue**: el service worker servía el
  código guardado primero, así que se seguía viendo la versión anterior una
  visita entera. Ahora el código va a la red primero y la copia es el
  respaldo.

## 2026-08-04 · Nivel de jugador, cronómetro, amigos, maestría animada y arreglos

- **Nivel de jugador infinito**: los puntos de todas tus partidas suman
  experiencia. Cada nivel pide más que el anterior y no hay tope. Se ve en la
  portada con su barra de progreso, y al subir sale un aviso en la partida.
- **Cronómetro** en la parte de abajo del laberinto, con el tiempo de la
  partida en mm:ss. Se para en pausa y en online lo lleva el anfitrión, así
  que los dos ven el mismo.
- **Amigos**: nueva pantalla para guardar con quién sueles jugar, con añadir
  y quitar. (Invitarlos y espectar sus partidas llega con las salas de grupo.)
- **La maestría ahora se celebra**: el cartel entra con rebote, la medalla
  late con rayos girando detrás, el nombre crece y un destello recorre el
  cartel antes de irse. Ya no es un simple mensaje.
- **Skins mucho más grandes** en OPCIONES: se dibujaban a 22 px y no se
  distinguían; ahora son el triple.
- **Corregido**: al morir no se podía abrir el menú con `Escape` ni con `P`.
  Ahora se puede pausar en cualquier momento de la partida, también durante
  la animación de muerte y el cambio de nivel.

## 2026-08-04 · Top mundial por jugador, app instalable, filtro de nombres, historial y pruebas

- **Una fila por jugador/dúo en el top mundial**: antes, quien más jugaba
  ocupaba toda la tabla con sus repeticiones (había 5 registros de un solo
  dúo). Ahora la clasificación muestra la **mejor marca de cada uno**, con
  una vista en Supabase.
- **Instalable en el móvil (PWA)**: `manifest.json` + service worker. Se
  añade a la pantalla de inicio como una app, arranca a pantalla completa y
  **funciona sin conexión** (incluidas las voces de racha). Las salas online
  y el ranking siempre van a la red, nunca a la caché.
- **Filtro de nombres y freno de envíos**: la clasificación es pública, así
  que los nombres con palabrotas no entran (se avisa al terminar la partida)
  y hay un límite de 5 envíos por nombre y minuto contra el spam. En local se
  puede seguir jugando con el nombre que se quiera.
- **TUS PARTIDAS**: tercera pestaña del TOP MUNDIAL con tus últimas 15
  partidas guardadas en este navegador. Se guardan **todas**, tengan nombre o
  no y haya red o no.
- **Pruebas automáticas** en `tests.html`: 24 casos sin dependencias sobre el
  juego real, centrados en lo que ya se rompió alguna vez (muerte por
  jugador, la señal de vida online, las rachas, las maestrías por modo, el
  ranking y el chat).

## 2026-08-04 · Top mundial separado (individual y dúo) y récords solo con nombre

- El TOP MUNDIAL se divide en **dos clasificaciones**: **INDIVIDUAL** y
  **DÚO**, con sus pestañas en el panel. Las partidas de un jugador **ya se
  registran** (antes solo entraban las de dos).
- **Sin nombre no hay récord**: para entrar en la clasificación hay que tener
  nombre puesto (los dos, en dúo). Si falta, el panel de fin de partida lo
  dice —"PON TU NOMBRE PARA ENTRAR EN EL TOP MUNDIAL"— en vez de descartar la
  partida en silencio.
- **Limpieza**: se han borrado de la clasificación los registros que entraron
  sin nombre (los que salían como J1/J2). Las partidas con nombre real se
  conservan.
- Corregido de paso: al cambiar de pestaña rápido, la respuesta de la
  anterior podía llegar más tarde y dejar el mensaje "aún no hay partidas"
  encima de una lista con resultados.

## 2026-08-04 · Las pestañas ya no se mueven al cambiar de una a otra

- En OPCIONES (y en MAESTRÍAS) el título y las pestañas **se quedan quietos**:
  antes el panel se recentraba en vertical y, como cada pestaña tiene un alto
  distinto, la fila de pestañas saltaba de sitio a cada clic. Ahora la
  cabecera va anclada arriba y solo cambia el contenido de debajo.
- Además, en pantallas donde el contenido no cabe, la fila de pestañas queda
  **fija arriba al desplazar**, en vez de perderse hacia arriba.

## 2026-08-04 · Voces de racha al comer fantasmas y volumen por tipo de sonido

- **Racha con voz**: comer fantasmas seguidos con el mismo energizante suelta
  **"el hueso"** (1.º), **"el diablo"** (2.º), **"el huesaso"** (3.º) y
  **"el diablo coño"** (4.º). Se reinicia con cada energizante, igual que la
  cadena de 200/400/800/1600.
- Funciona en **solo y en dúo**: la racha es del equipo, así que en pareja
  escala aunque los fantasmas se los coman entre los dos. En online la lleva
  el anfitrión y los dos oyen la misma voz.
- Los audios viven en `audio/` dentro del proyecto (ya se pueden borrar de
  Descargas). Son los **únicos archivos de audio** del juego; el resto sigue
  sintetizado. Si no se pueden cargar —por ejemplo abriendo `index.html` con
  doble clic, donde el navegador bloquea la lectura— el juego suena igual y
  la pestaña SONIDO lo avisa.
- **Volumen por categoría**: nueva pestaña SONIDO en OPCIONES con GENERAL,
  MÚSICA, EFECTOS, AMBIENTE (sirena y modo azul) y VOCES, cada uno de 0 a
  100 %, más el silencio de siempre. Se guardan con el resto de ajustes, y
  hay botones para probar cada voz.

## 2026-08-04 · Maestrías separadas: en solo y en dúo

- Las maestrías se dividen en **dos rutas independientes** con los mismos
  seis escalones: **EN SOLO** (tu récord de un jugador) y **EN DÚO** (el
  récord de equipo). Una gran partida en pareja ya no regala las insignias
  de solo, ni al revés.
- El panel MAESTRÍAS tiene ahora las pestañas **EN SOLO** y **EN DÚO**, cada
  una con su récord, sus insignias conseguidas y lo que falta para la
  siguiente.
- El aviso en partida dice de qué ruta es ("¡MAESTRÍA DE DÚO!"), y
  `Ctrl`+`Espacio` enseña **la del modo que estás jugando**.
- Lo que ya tuvieras conseguido se conserva: la lista antigua de insignias
  anunciadas se reparte entre las dos rutas, así que no vuelven a salir
  avisos de maestrías viejas.

## 2026-08-04 · Los emotes ahora son caras de Pac-Man

- Los emotes dejan de ser texto: son **caras de Pac-Man dibujadas** —
  **RISA**, **LLANTO**, **ENFADO**, **SUSTO**, **GUIÑO** y **AMOR**— con el
  cuerpo del color de tu jugador y los rasgos encima (ojos en arco, cejas,
  lagrimones, ojos de corazón...). Todo dibujado por código, sin imágenes, y
  se leen bien al tamaño del juego.
- **Las teclas `1`–`6` siguen el mismo orden de la lista** y la barra de
  EMOTES muestra cada cara con su número en la esquina, pintada con tu color.
  (Ojo: hasta la versión anterior los números solo funcionaban en partidas
  de dos jugadores; ahora van en todos los modos.)
- Corregido de paso: la barra de emotes se partía en dos líneas sin
  necesidad, porque al centrarla con `left:50%` solo disponía de la mitad del
  ancho del escenario.

## 2026-08-04 · Enseñar tu maestría con Ctrl+Espacio

- **`Ctrl`+`Espacio` muestra tu maestría sobre tu Pac-Man**: un globo con la
  medalla y el nombre de la insignia más alta que tengas, en su color, unos
  segundos. Si aún no tienes ninguna, sale "SIN MAESTRÍA".
- En **online el otro jugador también la ve** (viaja el identificador de la
  insignia, porque el récord es de cada máquina). Comparte el globo y el
  tiempo de espera de los emotes.
- Para jugar sin teclado, la barra de EMOTES incluye ahora el botón
  **MI MAESTRÍA**; esa barra pasa a estar disponible en todos los modos
  (antes solo en partidas de dos jugadores), y los emotes `1`–`6` también.

## 2026-08-04 · Menú de pausa transparente, navegación con flechas y opciones por pestañas

- **El menú de pausa deja ver el laberinto**: el velo pasa a ser
  semitransparente y el canvas baja el suyo mientras el menú está delante
  (antes se oscurecía dos veces). Los textos llevan sombra y los botones
  fondo propio para que se sigan leyendo. El panel de GAME OVER sí tapa más:
  ahí no hay partida que mirar.
- **Todo se maneja con las flechas**: en menús, opciones y diálogos las
  flechas mueven el foco y `Enter` (o espacio) activa. Los deslizadores se
  ajustan con izquierda/derecha, los campos de texto conservan el cursor, y
  al abrir un diálogo el botón principal queda enfocado. **En partida las
  flechas siguen moviendo a Pac-Man**: la navegación solo actúa con un panel
  o un diálogo en pantalla.
- **OPCIONES en tres pestañas** (se veía abarrotado): DIFICULTAD (presets y
  deslizadores), JUGADORES (nombres, colores y skins) y PARTIDA (vidas en 2
  jugadores, sonido y recordatorio de teclas). VOLVER queda fuera. En móvil
  cada pestaña entra en pantalla sin scroll.

## 2026-08-04 · Corregido: al morir uno, al otro se le congelaba la partida (online)

- En el modo online, cuando un jugador moría **el otro se quedaba clavado
  cerca de un segundo** antes de poder seguir. No era rendimiento (el bucle
  no tiene ningún pico): mientras el invitado hacía su animación de muerte
  dejaba de enviar su posición, y al anfitrión le saltaba el vigilante de
  desconexión (1,5 s sin datos), que **congela toda la simulación** y saca
  "ESPERANDO CONEXIÓN...".
- Ahora el invitado **sigue enviando al mismo ritmo mientras muere**, con la
  marca `dy`: cuenta como señal de vida, pero el anfitrión ignora esa
  posición (si la aplicara, devolvería al jugador al sitio donde murió justo
  después de reaparecer). Las pastillas que comió justo antes de morir se
  siguen contando.
- Medido: con el arreglo, 0 ticks congelados durante los 180 de la muerte
  completa; antes eran ~60 (un segundo entero de partida detenida).

## 2026-08-04 · Skins, emotes, maestrías, top mundial y chat

- **Skins** (6, todas disponibles desde el principio): CLÁSICO, OJOS, NEÓN,
  ARO, PÍXEL y SOMBRA. Se eligen en OPCIONES —cada miniatura se dibuja de
  verdad, con tu color— y se aplican al Pac-Man y a los iconos de vidas. En
  online cada uno ve la skin del otro (viaja en el saludo de la sala).
- **Emotes**: seis mensajes rápidos con globo sobre tu Pac-Man
  (¡HOLA!, ¡VAMOS!, ¡CUIDADO!, ¡BIEN!, ¡UPS!, GRACIAS), con teclas `1`–`6` y
  botón EMOTES en pantalla. Disponibles en las partidas de dos jugadores, con
  un pequeño tiempo de espera entre uno y otro para no saturar.
- **Maestrías**: seis insignias por récord personal (APRENDIZ 3 000, CAZADOR
  8 000, EXPERTO 15 000, MAESTRO 30 000, LEYENDA 60 000 y TOP MUNDIAL
  100 000). Al conseguir una sale un aviso con su medalla en plena partida, y
  el panel MAESTRÍAS del menú las lista con lo que falta para la siguiente.
- **TOP MUNDIAL**: clasificación de partidas de dos jugadores guardada en
  Supabase (tabla `ranking`, ya creada en el proyecto del juego). Las
  partidas de dúo (locales y online) se suben al terminar —en online solo las
  sube el anfitrión, una vez por partida— y el panel resalta las tuyas. Si la
  tabla faltase, el panel lo avisa y el resto del juego funciona igual. El
  script está en `supabase/ranking.sql`; además del RLS hace falta el `GRANT`
  de tabla a `anon`, o PostgREST responde 401.
- **Chat en el modo online**: se abre con `T` o el botón CHAT; los mensajes
  salen sobre la parte baja del laberinto unos segundos. Se limpian, se
  recortan a 40 caracteres y tienen un pequeño tiempo de espera entre envíos;
  mientras escribes, las teclas no mueven a Pac-Man.
- Nota: las puntuaciones del top mundial las manda el navegador, así que se
  pueden falsear. Si algún día molesta, la vía es validarlas en una Edge
  Function y dejar el `INSERT` solo a la clave de servicio.

## 2026-08-03 · Menú de pausa con reanudar, reiniciar y salir

- **`P` o `Esc` ya no solo pausan**: abren un **menú de pausa** con tres
  opciones, cada una con su atajo impreso en el botón:
  **REANUDAR** (`P` · `Esc`), **REINICIAR** (`R`) y **SALIR** (`Q`).
- **REINICIAR** empieza una partida nueva con la misma configuración. En un
  jugador y en dos jugadores locales es inmediato; **online lo tienen que
  aceptar los dos** (misma votación que la rendición: 20 s de plazo, y si se
  rechaza la partida se queda en pausa con el aviso en el propio menú).
- En online el menú sale **en las dos pantallas**, porque la pausa ya estaba
  coordinada. El botón `❚❚` táctil abre el mismo menú, así que en móvil
  también se puede reiniciar o salir sin recargar.
- Atajos en el resto de diálogos: `Enter` acepta y `Esc` rechaza en las
  votaciones; en el GAME OVER, `R` juega otra vez y `Q`/`Esc` va al menú.
  Con un diálogo abierto las teclas ya no mueven a Pac-Man.
- Protocolo online `PROTO` 2 → **3** (tipo de votación `restart`). Ambos
  extremos deben estar actualizados.

## 2026-08-03 · La partida no se para al morir uno · muros finos · nombre en la portada

- **Muerte por jugador**: en dos jugadores (local u online) morir ya **no
  detiene la partida**. Solo se congela ese Pac-Man, hace su animación y
  reaparece en su salida con **2 s de invulnerabilidad** (parpadea y los
  fantasmas le atraviesan). El otro sigue comiendo, los fantasmas siguen
  moviéndose y la música no se corta. El parón clásico (reinicio de
  fantasmas y "¡LISTO!") solo ocurre cuando **cae el último**. Mientras
  estás muerto los fantasmas dejan de perseguirte. En un jugador todo sigue
  exactamente igual que antes.
- **Muros más finos**: el trazo de cada pared se dibuja 2 px hacia dentro de
  su casilla, así los bloques se ven delgados y los pasillos anchos, mucho
  más cerca del arcade. Las esquinas cierran limpias y la puerta de la casa
  se alinea con las paredes vecinas.
- **Nombre en la portada** (estilo agar.io): campo "TU NOMBRE" justo encima
  de los botones de jugar, además del de OPCIONES. Los dos campos se
  sincronizan y `Intro` confirma.
- Capturas del README actualizadas (menú, partida y opciones).

## 2026-08-03 · Rendición, revancha y nombres de jugador

- **Botón RENDIRSE** en la barra superior de la partida (en todos los
  dispositivos, junto al botón de pausa táctil). En un jugador pide
  confirmación; **en dos jugadores tienen que aceptarlo los dos**: el que lo
  propone ve la cuenta atrás y el otro decide (ACEPTAR / SEGUIR JUGANDO). La
  partida se queda en pausa mientras se decide, y si se rechaza o pasan 20 s
  se sigue jugando con un aviso en pantalla.
- **Revancha tras el GAME OVER**: el juego ya no vuelve solo al menú. Tras el
  rótulo aparece un panel con los nombres, la puntuación, el récord y el
  nivel, y dos botones: OTRA PARTIDA y MENÚ. En local empieza al momento; en
  online es otra votación, y al aceptar los dos arrancan una partida nueva
  **con el mismo compañero y la misma configuración** sin volver a la sala.
- **Nombres de jugador** (hasta 8 caracteres) en OPCIONES → NOMBRES: el tuyo
  (J1 y online) y el del jugador 2 local. Se ven en el marcador, sobre cada
  Pac-Man en el "¡LISTO!", en la sala online, en los diálogos y en el panel
  de GAME OVER. Se intercambian en el saludo de la sala.
- Durante el GAME OVER online la conexión sigue viva (se espera la
  respuesta a la revancha) y el vigilante de desconexión también actúa ahí:
  si el otro se va, sale el aviso "EL OTRO JUGADOR HA SALIDO".
- Protocolo online `PROTO` 1 → **2** (mensajes nuevos `vote`, `voteRes` y
  `rematch`, y nombre en el saludo). Ambos extremos deben estar actualizados.

## 2026-07-29 · Crucetas táctiles y corrección de colisiones

- **Crucetas de dirección en pantalla** (▲◀▶▼), además del deslizamiento:
  una centrada en 1 jugador y online; dos en las esquinas inferiores en
  2 jugadores locales (izquierda J1, derecha J2). Solo aparecen en
  dispositivos táctiles y durante la partida; responden a `pointerdown`
  (toque instantáneo, sin retardo de click).
- **Corregido "atravesar fantasmas"**: la colisión era por casilla una vez
  por tick, así que al cruzarse de frente Pac-Man y un fantasma podían
  intercambiar casillas en el mismo tick sin colisionar (fallo que también
  tenía el arcade original de 1980). Ahora el intercambio de casillas
  cuenta como colisión: sin superpastilla te mata, con fantasma azul te lo
  comes. Aplica también a la simulación local del invitado online. Los
  «ojos» que vuelven a casa siguen atravesándote: es el comportamiento
  correcto del arcade.

## 2026-07-29 · Soporte móvil completo

- Control táctil multitáctil: deslizar sobre el laberinto; en 2 jugadores
  locales la **mitad izquierda** de la pantalla controla a J1 y la
  **derecha** a J2 (dos pulgares simultáneos).
- **Botón de pausa en pantalla** (`❚❚`) en dispositivos táctiles, integrado
  con la pausa coordinada del modo online.
- Paneles (menú, opciones, lobby) **a pantalla completa** en móviles, y
  corrección del menú recortado en pantallas bajas (el centrado vertical
  impedía hacer scroll hasta el título).
- Pulido táctil: sin zoom por doble toque ni resaltado azul al tocar,
  teclado en mayúsculas al escribir códigos de sala, metadatos de web-app
  (barra negra, tema oscuro).

## 2026-07-29 · Multijugador: 2 jugadores locales y online

- **Menú nuevo**: UN JUGADOR · DOS JUGADORES · JUGAR ONLINE · OPCIONES.
- **Dos jugadores en la misma máquina** (J1 flechas, J2 WASD), cooperativo
  simultáneo contra los fantasmas en el mismo laberinto.
- **Modo online (2 jugadores)**: salas con código de 4 letras y enlace
  compartible `?sala=CODE` que une automáticamente. Transporte por canales
  broadcast de **Supabase Realtime** con cliente Phoenix/WebSocket propio
  (sin librerías, sin tocar la base de datos); transporte alternativo
  `?red=local` (dos pestañas) para desarrollo. El anfitrión simula la
  partida completa y emite instantáneas ~12 Hz; el invitado simula su
  propio Pac-Man en local (sin lag de entrada) con predicción confirmada
  para comer puntos, fantasmas y morir. Avisos de conexión perdida o
  abandono del otro jugador.
- **Reglas de equipo** (ambos modos de 2 jugadores): un solo marcador con
  récord propio (`highscore-2p`), vida extra a los 10 000, y vidas
  **compartidas** (fondo común, por defecto) o **individuales** (quien las
  pierde queda de espectador), configurable en OPCIONES.
- **IA adaptada**: cada fantasma aplica su personalidad original al jugador
  vivo más cercano. Los jugadores se atraviesan entre sí. Salidas
  simétricas con etiquetas J1/J2 durante el «¡LISTO!».
- **Color del jugador 2** configurable (verde por defecto); en online cada
  jugador usa su propio color y el anfitrión fija la dificultad.

## 2026-07-28 · Juego base

- Recreación fiel del Pac-Man arcade de 1980 en JavaScript vanilla:
  laberinto original de 244 pastillas, IA real de los cuatro fantasmas
  (incluido el bug de desbordamiento de Pinky/Inky), ciclos
  scatter/chase, tablas de velocidad, Cruise Elroy, contadores de la casa,
  frutas, sirenas y audio 100 % sintetizado con Web Audio API.
- Dificultad configurable (presets y ajustes finos), color de Pac-Man
  personalizable, récord persistente.
