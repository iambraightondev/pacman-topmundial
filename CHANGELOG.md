# Historial de cambios

Juego en producción: <https://pacman-topmundial.vercel.app>

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
