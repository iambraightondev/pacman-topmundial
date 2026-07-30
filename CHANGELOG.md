# Historial de cambios

Juego en producción: <https://pacman-topmundial.vercel.app>

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
