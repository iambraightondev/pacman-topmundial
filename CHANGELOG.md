# Historial de cambios

Juego en producción: <https://pacman-topmundial.vercel.app>

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
