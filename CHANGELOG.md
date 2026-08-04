# Historial de cambios

Juego en producción: <https://pacman-topmundial.vercel.app>

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
