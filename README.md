# PAC-MAN · Top Mundial

Recreación fiel del Pac-Man arcade de 1980, construida desde cero en JavaScript
vanilla (HTML5 Canvas + Web Audio API). Sin dependencias, sin build, sin
servidor: un solo doble clic y a jugar. Con modo de **dos jugadores en la misma
máquina** y modo **online** para jugar en equipo contra los fantasmas.

| Menú | Partida | Dos jugadores online | Móvil |
|------|---------|----------------------|-------|
| ![Menú](capturas/menu.png) | ![Partida](capturas/gameplay.png) | ![Online](capturas/online-2j.png) | ![Móvil](capturas/movil.png) |

Historial de novedades: [CHANGELOG.md](CHANGELOG.md)

## Cómo jugar

- **Windows**: doble clic en `jugar.bat` (levanta un servidor local y abre el navegador), o simplemente abre `index.html` directamente.
- **Cualquier sistema**: `python -m http.server 8264` en la carpeta y visita `http://localhost:8264`.
- **Controles**: flechas o WASD para moverte · `P` para pausa.
- **Dos jugadores (local)**: J1 con las flechas, J2 con WASD.
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
  cercano manteniendo su personalidad original.
- **Online (2 jugadores)** — las mismas reglas de equipo, cada uno desde su
  casa. Uno crea una sala y comparte el código de 4 letras (o el enlace
  directo); el otro se une. El anfitrión fija la dificultad; cada jugador usa
  su propio color.

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

Sin credenciales, el resto del juego funciona igual; solo el botón de crear
o unirse a salas queda deshabilitado. Para probar el online en local sin
Supabase, abre dos pestañas con `?red=local` en la URL.

## Características

**Fidelidad al arcade original** — mecánicas implementadas según el comportamiento documentado de la máquina de 1980:

- Laberinto original de 28×31 con sus 244 puntos, túnel lateral y casa de fantasmas.
- Las cuatro personalidades reales de los fantasmas: Blinky (persecución directa), Pinky (emboscada 4 casillas por delante, incluyendo el bug de desbordamiento del arcade al mirar hacia arriba), Inky (vector doblado desde Blinky) y Clyde (huye a menos de 8 casillas).
- Ciclos scatter/chase con los tiempos exactos por nivel, reversa forzada en cada cambio de modo, zonas de no-subida y desempate de direcciones del original.
- Tablas de velocidad por nivel, ralentización en el túnel, Cruise Elroy, contadores de salida de la casa de fantasmas (personales, globales tras perder vida, y temporizador de seguridad).
- Frutas en 70 y 170 puntos comidos, cadena de fantasmas 200/400/800/1600, vida extra a los 10 000, niveles infinitos con la curva de dificultad del arcade.
- Una mejora deliberada sobre el original: la colisión detecta el cruce de casillas en el mismo tick, así que no puedes atravesar fantasmas al cruzarte de frente (el arcade de 1980 sí lo permitía por error).
- Sonido 100 % sintetizado en tiempo real con Web Audio API: melodía de inicio, waka-waka, sirenas progresivas, modo asustado, ojos volviendo a casa, muerte, fruta y vida extra.

**Personalización:**

- **Dificultad**: presets Fácil / Normal / Difícil + ajustes finos (velocidad de fantasmas y de Pac-Man, duración del power pellet, vidas, nivel inicial).
- **Colores de los dos jugadores**: 8 colores rápidos + selector libre por jugador. Se aplican en vivo.
- **Vidas en 2 jugadores**: compartidas (por defecto) o individuales.
- Configuración y récords (1 jugador y equipo) guardados automáticamente en el navegador (localStorage).

**Multijugador online (arquitectura):**

- El **anfitrión** simula la partida completa (fantasmas, contadores, fruta,
  puntuación) y emite instantáneas ~12 veces por segundo.
- El **invitado** simula su propio Pac-Man en local — sin lag de entrada — y
  refleja el resto; come puntos y fantasmas con predicción local que el
  anfitrión confirma.
- Salas efímeras con código de 4 letras sobre canales de difusión de
  Supabase Realtime (cliente Phoenix/WebSocket propio, sin librerías).
  Desconexiones detectadas con aviso y vuelta al menú.

## Estructura

```
index.html        Página principal
css/style.css     Estilos y escalado pixel-perfect
js/config.js      Constantes, laberinto y tablas del arcade
js/audio.js       Síntesis de sonido (Web Audio API)
js/sprites.js     Sprites dibujados por código
js/pacman.js      Jugador
js/ghost.js       IA de los fantasmas
js/net-config.js  Credenciales de Supabase (modo online)
js/net.js         Transporte en tiempo real (Supabase Realtime / local)
js/game.js        Bucle principal, máquina de estados y sincronización
js/ui.js          Menús, opciones, lobby online, controles táctiles
SPEC.md           Especificación técnica completa
CHANGELOG.md      Historial de cambios
```

## Nota legal

Proyecto educativo sin ánimo de lucro. Todo el código, los gráficos
(dibujados proceduralmente) y la música (composición original) de este
repositorio son originales; no contiene ningún recurso extraído del juego
original. PAC-MAN es una marca registrada de Bandai Namco Entertainment.
Este proyecto no está afiliado ni respaldado por Bandai Namco.
