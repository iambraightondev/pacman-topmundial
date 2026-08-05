# PAC-MAN · Top Mundial

Recreación fiel del Pac-Man arcade de 1980, construida desde cero en JavaScript
vanilla (HTML5 Canvas + Web Audio API). Sin dependencias, sin build, sin
servidor: un solo doble clic y a jugar. Con modo de **dos jugadores en la misma
máquina** y modo **online de hasta cuatro** en equipo contra los fantasmas,
con **partys** que no se deshacen entre partida y partida.

| Menú | Partida | Equipo online | Móvil |
|------|---------|----------------------|-------|
| ![Menú](capturas/menu.png) | ![Partida](capturas/gameplay.png) | ![Online](capturas/online-2j.png) | ![Móvil](capturas/movil.png) |

Historial de novedades: [CHANGELOG.md](CHANGELOG.md)

## Instalar en el móvil

Abre <https://pacman-topmundial.vercel.app> y usa **«Añadir a pantalla de
inicio»** (Chrome: menú ⋮ → Instalar app; iPhone: Compartir → Añadir a
pantalla de inicio). Se abre a pantalla completa, sin barra del navegador, y
**funciona sin conexión** — solo las salas online y el top mundial necesitan
red.

## Cómo jugar

- **Windows**: doble clic en `jugar.bat` (levanta un servidor local y abre el navegador). Se puede abrir `index.html` directamente, pero entonces el navegador bloquea la lectura de los audios y las **voces de racha no suenan**; el resto del juego funciona igual.
- **Cualquier sistema**: `python -m http.server 8264` en la carpeta y visita `http://localhost:8264`.
- **Controles**: flechas o WASD para moverte · `P` o `Esc` abren el **menú de
  pausa** (semitransparente, se sigue viendo el laberinto): REANUDAR
  (`P`/`Esc`), REINICIAR (`R`) y SALIR (`Q`). Online, reiniciar lo tenéis que
  aceptar los dos.
- **Los menús se manejan con las flechas**: mueven el foco y `Enter` acepta;
  en los deslizadores, izquierda y derecha ajustan el valor.
- **Dos jugadores (local)**: J1 con las flechas, J2 con WASD.
- **Rendirse**: botón `RENDIRSE` arriba a la derecha. En dos jugadores (local
  u online) la partida solo termina si **lo aceptan los dos**.
- **Al terminar**: cuando acaban las celebraciones, el GAME OVER resume lo
  que te llevas —puntos, experiencia y nivel de jugador, y los logros de esa
  partida— y ofrece **otra partida con tu mismo dúo** (en online, aceptándolo
  los dos) sin pasar por el menú ni volver a crear sala.
- **Móvil / táctil**: cruceta de botones en pantalla y/o deslizar sobre el
  laberinto — lo que prefieras; botón `❚❚` para pausar. En dos jugadores
  locales hay dos crucetas (esquinas inferiores: izquierda J1, derecha J2)
  y el deslizamiento va por mitades de pantalla, con multitáctil real. El
  modo online va perfecto en móvil: comparte el enlace de la sala por
  WhatsApp y el otro entra directo.

## Modos de juego

- **Un jugador** — el arcade clásico.
- **Dos jugadores (misma máquina)** — cooperativo simultáneo contra los
  fantasmas, en el mismo laberinto. Puntuación de equipo (un solo marcador y
  récord propio de 2 jugadores). Vidas **compartidas** (fondo común, por
  defecto) o **individuales** (quien las pierde queda de espectador),
  configurable en OPCIONES. Cada fantasma persigue al jugador vivo más
  cercano manteniendo su personalidad original. **Si muere uno, la partida
  no se detiene**: reaparece a los pocos segundos (con un momento de
  invulnerabilidad) mientras el otro sigue jugando; el laberinto solo se
  reinicia cuando caen los dos.
- **Online (2, 3 o 4 jugadores)** — las mismas reglas de equipo, cada uno
  desde su casa. Uno crea una **party** y comparte el código de 4 letras (o
  el enlace directo); los demás se unen. El líder fija la dificultad y decide
  cuándo empezar; cada jugador lleva su propio color. Con 3 y 4, los dos
  jugadores extra salen **arriba** del laberinto, no a tu lado.

### Partys, amigos y espectar

- **La party no se deshace**: se entra una vez y el grupo sigue junto al
  volver al menú o al acabar la partida, así que se pueden encadenar
  partidas sin volver a pasar el código. El botón del menú indica
  `PARTY (n/4)`. Desde dentro: invitar, empezar, volver al menú sin salirse
  o salir del todo.
- **La lista de AMIGOS**: cada uno con su avatar y su nombre, y un botón
  `OPCIONES` que despliega qué hacer con él (ver su perfil, ver su partida,
  invitarlo o quitarlo).
- **Invitar a un amigo por su nombre**: aunque no esté en la party, le llega
  un aviso para entrar. También está en las opciones de su ficha en AMIGOS.
- **Ver la partida de un amigo**: `VER PARTIDA` en su ficha le pregunta dónde
  está jugando y entras solo a mirar (sin Pac-Man, sin chat y sin voto); lo
  que veas no cuenta como partida tuya. Vale **juegue como juegue**: en party,
  online o él solo en su casa. **Tu party sigue en pie mientras miras**: se ve
  por un canal aparte, así que no hay que salirse del grupo, y si los tuyos
  arrancan una partida dejas de mirar y entras con ellos.
- **Ver el perfil de un amigo**: `VER PERFIL` en su ficha enseña su avatar, su
  nivel, su experiencia, sus récords y sus 15 logros con el progreso de cada
  uno. Hace falta que tenga cuenta.
- **Si alguien se cae con 3 o 4 jugadores, la partida no se corta**: quien
  se va o pierde la conexión pasa a espectador y el resto sigue.

### Configurar el modo online

El modo online usa **Supabase Realtime** como canal de comunicación (solo
canales de difusión: no crea tablas ni escribe en la base de datos). Para
activarlo, copia la URL y la clave *anon/publishable* de tu proyecto de
Supabase (Dashboard → Settings → API) en `js/net-config.js`:

```js
window.PM.NET_CFG = {
  SUPABASE_URL: 'https://tuproyecto.supabase.co',
  SUPABASE_KEY: 'sb_publishable_... o eyJ...'
};
```

Sin credenciales, el resto del juego funciona igual; solo crear party o
unirse queda deshabilitado. Para probar el online en local sin Supabase,
abre dos (o hasta cuatro) pestañas con `?red=local` en la URL.

### El TOP MUNDIAL

Las clasificaciones usan la tabla `ranking` del mismo proyecto de Supabase,
**ya creada y en marcha**, con la columna `jugadores` para separar individual
(1) de dúo (2) y `tiempo1` para el récord de velocidad del primer nivel (en
centésimas de segundo; va a `null` en las partidas que no cuentan para esa
clasificación). Si alguna vez hay que recrearla o ponerla al día, el script
está en [`supabase/ranking.sql`](supabase/ranking.sql): **Dashboard → SQL
Editor → New query**, pegar y *Run* (se puede ejecutar las veces que haga
falta). Deja lectura e inserción públicas, sin permiso para modificar ni
borrar. Si la tabla falta, el panel TOP MUNDIAL lo avisa y el resto del juego
funciona con normalidad.

Las puntuaciones las envía el navegador, así que técnicamente se pueden
falsear; para un ranking a prueba de trampas habría que validar la partida en
una Edge Function y reservar el `INSERT` a la clave de servicio.

### Las cuentas

Usan **Supabase Auth** por REST, sin librerías. El jugador solo ve usuario y
contraseña: el correo que Supabase exige se compone por dentro
(`usuario@cuentas.pacman-topmundial.vercel.app`) y no se enseña en ninguna
parte. Las tablas (`perfiles` y `amigos`, con RLS: cada uno solo escribe lo
suyo) están en [`supabase/cuentas.sql`](supabase/cuentas.sql).

**Ajuste obligatorio del proyecto**, que no se puede hacer por SQL —
*Authentication → Sign In / Providers*:

- **Email**: activado
- **Allow new users to sign up**: activado
- **Confirm email**: **apagado**

Con la confirmación encendida el alta no devuelve sesión, y como ese buzón no
existe, el enlace no llega nunca y nadie puede entrar.

## Pruebas

Dos maneras de correr la misma batería:

- **En el navegador**: abre `tests.html` desde el servidor, igual que el juego.
  El resultado queda también en `window.__TESTS`. Ojo: tras editar algo de
  `js/`, levanta el servidor en un **puerto nuevo** o el navegador te servirá
  la versión anterior del fichero (caché heurística) y estarás probando el
  código viejo sin enterarte.
- **Sin navegador**: `node pruebas-node.js`. Monta un DOM de mentira y corre
  lo mismo; sale con código 1 si falla alguna, así que vale para CI. Lo único
  que se salta son las comprobaciones que cuentan píxeles dibujados.

## Características

**Fidelidad al arcade original** — mecánicas implementadas según el comportamiento documentado de la máquina de 1980:

- Laberinto original de 28×31 con sus 244 puntos, túnel lateral y casa de fantasmas.
- Las cuatro personalidades reales de los fantasmas: Blinky (persecución directa), Pinky (emboscada 4 casillas por delante, incluyendo el bug de desbordamiento del arcade al mirar hacia arriba), Inky (vector doblado desde Blinky) y Clyde (huye a menos de 8 casillas).
- Ciclos scatter/chase con los tiempos exactos por nivel, reversa forzada **al instante** en cada cambio de modo (como el arcade, sin esperar al centro de la casilla), zonas de no-subida y desempate de direcciones del original.
- Los fantasmas **piensan una casilla antes**: al entrar en una casilla ya deciden por dónde saldrán, así que miran a Pac-Man medio paso antes del cruce. De ahí que a veces "se equivoquen", y es lo que sostiene los patrones memorizados.
- Tablas de velocidad por nivel, ralentización en el túnel, Cruise Elroy, contadores de salida de la casa de fantasmas (personales, globales tras perder vida, y temporizador de seguridad).
- Comer puntos frena a Pac-Man **exactamente** lo que lo frenaba el original: corre a su velocidad normal y pierde un fotograma por punto, que es de donde sale la columna «Pac-Man (dots)» de las tablas (71% en el nivel 1).
- **El azar es reproducible**: los fantasmas azules huyen según un contador que se reinicia con cada nivel, igual que en la máquina. Sin eso no habría patrón que valiera, porque cada intento saldría distinto.
- Frutas en 70 y 170 puntos comidos, cadena de fantasmas 200/400/800/1600, vida extra a los 10 000, niveles infinitos con la curva de dificultad del arcade.
- La colisión es **compartir casilla y nada más**, como en la máquina: si Pac-Man y un fantasma se cruzan de frente e intercambian casilla en el mismo fotograma, se atraviesan. Es un fallo del arcade de 1980, pero se respeta a propósito — los patrones del original cuentan con él.
- Sonido sintetizado en tiempo real con Web Audio API: melodía de inicio, waka-waka, sirenas progresivas, modo asustado, ojos volviendo a casa, muerte, fruta y vida extra.
- **Voces de racha**: al comer fantasmas seguidos con el mismo energizante suenan «el hueso», «el diablo», «el huesaso» y «el diablo coño». Es lo único grabado del juego (en `audio/`), y en dúo la racha cuenta para el equipo.

**Personalización:**

- **Dificultad**: presets Fácil / Normal / Difícil + ajustes finos (velocidad de fantasmas y de Pac-Man, duración del power pellet, vidas, nivel inicial).
- **Nombres de jugador** (12 caracteres): se escribe en la propia portada
  —el tuyo, que es también el que ve tu rival online— y en OPCIONES está
  además el del jugador 2 local. Aparecen en el marcador, sobre cada Pac-Man
  al empezar, en la sala online y en el panel de fin de partida.
- **Colores de los dos jugadores**: 8 colores rápidos + selector libre por jugador. Se aplican en vivo.
- **Skins**: CLÁSICO, SOMBRA, OJOS, NEÓN, ARO y PÍXEL, combinables con
  cualquier color. Se **ganan subiendo de nivel de jugador** (3, 7, 12, 20 y
  30, en ese orden); las que faltan salen apagadas con el nivel que piden. La
  que ya llevabas puesta no se te quita nunca. **La tuya se elige en PERFIL**,
  junto al avatar; en OPCIONES está la del jugador 2 local.
- **Perfil**: avatar (16, dibujados por código: Pac-Man y sus caras, los
  cuatro fantasmas, el asustado, los ojos, frutas y la medalla), tu skin,
  nombre, nivel con su barra y un resumen de logros, maestría y récord. De
  invitado hay un botón para **sortear un nombre** al azar.
- **Logros**: 15, de conseguir un doblete de fantasmas a comerte 1000, pasando
  por despejar niveles sin morir, frutas, partidas jugadas o hacer el nivel 1
  en menos de 1:30. Salen celebrados en la partida y se siguen en PERFIL con
  su barra de progreso.
- **Cuenta con usuario y contraseña** (opcional): guarda nivel, logros,
  maestrías, récords y amigos, y te los lleva a cualquier sitio. No pide
  correo. El usuario es también tu nombre en el juego. Al entrar, lo de la
  nube y lo de este navegador se funden quedándose con lo mejor de cada lado.
  De invitado se juega igual, pero sin lista de amigos.
- **Emotes**: seis caras de Pac-Man (risa, llanto, enfado, susto, guiño y
  amor) con las teclas `1`–`6`, en el color de tu jugador. **Están animadas**:
  caen las lágrimas, el enfadado echa humo, el guiño abre el ojo con un
  chispazo, los corazones laten... Y **chat** (`T`) en el modo online.
- **Maestrías**: seis insignias por récord personal, en **dos rutas
  separadas** —en solo y en dúo—, con su propio panel en el menú: la lista a
  la izquierda y, a la derecha, **la elegida en grande**. Se pulsa la que
  quieras y se ve; al entrar sale sola la que tienes. En partida, **cada vez que cruzas
  un escalón** sale el cartel animado, lo tuvieras ya o no. Con
  **`Ctrl`+`Espacio`** (o el botón MI MAESTRÍA) enseñas la del modo que estés
  jugando sobre tu Pac-Man —con la medalla subiendo y la chapa
  desplegándose—, y en online la ven los demás. **Cuanto más alta es la
  maestría, más se celebra**: APRENDIZ sube y ya está; CAZADOR gira y suelta
  chispas; EXPERTO añade el destello; MAESTRO, onda expansiva y chispas
  cayendo; LEYENDA, rayos girando, estrellas en órbita y el nombre
  escribiéndose letra a letra; y TOP MUNDIAL, además, fogonazo y corona.
  **Y la chapa cambia de forma**: rectángulo hasta CAZADOR, esquinas cortadas
  en EXPERTO, hexágono en MAESTRO, banderín en LEYENDA y banderín de punta
  larga y cola dentada en TOP MUNDIAL.
- **Top mundial**: clasificaciones compartidas entre todos —**individual**,
  **dúo** y **nivel 1** (quién lo despeja en menos tiempo)—, con la mejor
  marca de cada jugador. Hace falta tener nombre puesto (y sin palabrotas)
  para registrar un récord. La de velocidad se manda **en cuanto despejas el
  primer nivel**, así que cuenta aunque después te maten o te salgas, y solo
  vale a un jugador, sin red y con los ajustes de siempre: con los fantasmas
  frenados o Pac-Man acelerado la marca no sería comparable con la de nadie.
- **Tus partidas**: historial de las últimas 15 en este navegador, con o sin
  nombre y con o sin conexión.
- **Nivel de jugador**: mide **cuánto juegas**, no si haces récord. Los
  puntos de todas tus partidas suman experiencia —500 puntos suman 500— y
  cuentan **acabe como acabe la partida**: game over, rendición, reinicio o
  salirte a medias. Cada nivel cuesta más que el anterior y no hay tope.
- **Amigos**: lista para guardar con quién sueles jugar, invitarlos a tu
  party y ver sus partidas.
- **Cronómetro** en partida, con el tiempo transcurrido.
- **Vidas en 2 jugadores**: compartidas (por defecto) o individuales.
- **Volumen por tipo de sonido**: general, música, efectos, ambiente (sirena
  y modo azul) y voces, cada uno por separado en OPCIONES → SONIDO.
- Configuración y récords (1 jugador y equipo) guardados automáticamente en el navegador (localStorage).

**Multijugador online (arquitectura):**

- El **anfitrión** simula la partida completa (fantasmas, contadores, fruta,
  puntuación) y emite instantáneas ~12 veces por segundo.
- El **invitado** simula su propio Pac-Man en local — sin lag de entrada — y
  refleja el resto; come puntos y fantasmas con predicción local que el
  anfitrión confirma.
- Salas con código de 4 letras sobre canales de difusión de Supabase
  Realtime (cliente Phoenix/WebSocket propio, sin librerías). La **party y
  la partida comparten canal**, por eso el grupo sigue conectado en el menú;
  además cada jugador escucha un canal propio con su nombre, por donde le
  llegan las invitaciones. Desconexiones detectadas con aviso: con dos
  jugadores se vuelve al menú, con tres o cuatro solo cae el que falla.
- **Rendición y revancha por votación**: cualquiera propone, el otro acepta o
  rechaza (20 s de plazo); el anfitrión ejecuta la decisión y la reparte. La
  sala sigue viva tras el GAME OVER para poder encadenar partidas.

## Estructura

```
index.html        Página principal
css/style.css     Estilos y escalado pixel-perfect
js/config.js      Constantes, laberinto y tablas del arcade
js/audio.js       Sonido: síntesis (Web Audio) y voces de racha
audio/            Voces de racha (los únicos archivos de audio)
js/sprites.js     Sprites dibujados por código
js/pacman.js      Jugador
js/ghost.js       IA de los fantasmas
js/net-config.js  Credenciales de Supabase (online y top mundial)
js/net.js         Transporte en tiempo real (Supabase Realtime / local)
js/party.js       Partys persistentes, invitaciones y arranque de grupo
js/badges.js      Maestrías (insignias por récord personal)
js/history.js     Historial local de partidas
js/level.js       Nivel de jugador (experiencia acumulada)
js/friends.js     Lista de amigos
js/ranking.js     Top mundial (tabla de Supabase vía REST)
js/game.js        Bucle principal, máquina de estados y sincronización
js/ui.js          Menús, opciones, panel de party, paneles y controles
manifest.json     App instalable (PWA)
sw.js             Service worker: funciona sin conexión
icons/            Iconos de la app
tests.html        Pruebas automáticas (ábrelo como el juego)
supabase/         SQL de la tabla y la vista del ranking
SPEC.md           Especificación técnica completa
CHANGELOG.md      Historial de cambios
```

## Nota legal

Proyecto educativo sin ánimo de lucro. Todo el código, los gráficos
(dibujados proceduralmente) y la música (composición original) de este
repositorio son originales; no contiene ningún recurso extraído del juego
original. PAC-MAN es una marca registrada de Bandai Namco Entertainment.
Este proyecto no está afiliado ni respaldado por Bandai Namco.
