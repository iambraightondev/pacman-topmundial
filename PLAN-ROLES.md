# Plan · Roles en DESATADO (Atacante, Tanque, Soporte)

Plan para que otra sesión lo implemente sin tener que preguntar. Las
decisiones de juego **ya están tomadas con Braighton** (17 sep 2026); si algo
de aquí choca con el código, manda el código y se avisa, no se inventa.

Antes de tocar nada, leer: `PENDIENTE.md` (arriba del todo), `SPEC.md`
sección *Modo DESATADO (Q/W/E/R)*, `js/habilidades.js` entero y `CFG.HAB` en
`js/config.js`. El estilo del repo es comentario largo en español explicando
el porqué; los identificadores internos siguen la línea existente.

---

## 1 · Qué se construye

DESATADO deja de tener un único juego de poderes. Cada jugador elige un
**rol** antes de empezar. El kit actual pasa a ser el Atacante, sin cambios.

| Rol | Q | W | E | R |
|---|---|---|---|---|
| **ATACANTE** (el de hoy) | MORDISCO · 16 s | TURBO · 24 s | FLASH · 32 s | GRITO · 60 s |
| **TANQUE** | PROVOCAR · 16 s | ESCUDO · 24 s | PISOTÓN · 32 s | ARROLLAR · 60 s |
| **SOPORTE** | DISPARO HELADO · 16 s | INMUNIDAD · 24 s | ESCUDO ALIADO · 32 s | VIDA EXTRA · 300 s |

### Tanque
- **Q · PROVOCAR (3 s).** Todos los fantasmas en modo normal (no en casa, no
  ojos, no azules) toman como objetivo la casilla del Tanque durante 3 s. Es
  lo que protege al equipo. En solo funciona igual (práctica).
- **W · ESCUDO (5 s).** Mientras dure, el **primer** choque con un fantasma
  no azul no mata: se consume el escudo y el fantasma **no** muere ni se
  come. Tras consumirse, `safeTicks` corto (~0,5 s) para no morir en el tick
  siguiente contra el mismo fantasma. Visual: aro (reutilizar la idea del
  aro cian de REVIVIR, otro color).
- **E · PISOTÓN (3 s).** Los fantasmas a ≤ 4 casillas **huyen del Tanque**
  durante 3 s: eligen en cada cruce la salida que más los aleja de él.
  **No** se ponen azules, **no** son comibles, **no** cambia la música ni la
  cadena de puntos, y siguen matando si tocas. Si no hay ninguno a 4
  casillas, no sale y no gasta recarga (como el FLASH contra el borde).
- **R · ARROLLAR.** Carga 4 casillas en la dirección de la última flecha,
  **sin** atravesar muros (se para en la pared), rápida (~0,3 s). Se come
  —como un fantasma azul, con sus puntos y su cadena— a todo fantasma no
  ojos/no casa que toque en el recorrido. Invulnerable mientras carga. Si no
  hay ni una casilla libre delante, no sale.
  - ⚠️ **El id interno NO puede ser `embestida`**: ya existe en
    `CFG.HAB.LIST_G` (poder del fantasma humano en PAC-MAN VS.). Usar
    `arrollar`.

### Soporte
- **Q · DISPARO HELADO.** Proyectil en línea recta hacia la última flecha,
  velocidad ~3× Pac-Man, se detiene al tocar pared (el túnel lo atraviesa).
  Al alcanzar el primer fantasma válido lo **congela 3 s**, y también a
  **todos los fantasmas que estén en esa misma casilla**. Sin blanco llega a
  la pared y **gasta la recarga igualmente** (decidido: si no, se dispara sin
  parar).
  - Fantasma congelado: no se mueve, **no mata** a quien lo toque y el
    Atacante **sí puede morderlo** (Q). Si se congela un fantasma azul, sigue
    azul y comible. Visual: tinte celeste/escarcha.
  - Un fantasma con jugador humano (VS.) no aplica: ver §2.
- **W · INMUNIDAD (2 s).** Intocable 2 s: los choques no matan (a diferencia
  del ESCUDO, no se consume). Puede comer azules normalmente.
- **E · ESCUDO ALIADO (3 s).** Da al compañero vivo **más cercano** (distancia
  en píxeles, túnel incluido) un escudo de 3 s con la misma mecánica que el
  W del Tanque (absorbe un golpe). Sin compañeros vivos (solo, o todos
  fuera) no sale y no gasta.
- **R · VIDA EXTRA (recarga 5 min).** +1 vida.
  - Destino: el compañero **vivo en el laberinto** con **menos vidas**
    (empate: el más cercano); si todos tienen las mismas o está solo, a sí
    mismo. Con `livesMode === 'shared'`, suma a la vida compartida.
  - **No revive** a quien está `out`: eso sigue siendo cosa de REVIVIR y
    CONTINUAR.
  - Tope: no pasa de un máximo (proponer `CFG.HAB.VIDA_MAX = 5`); si el
    destino ya está al tope, busca el siguiente; si nadie puede, no sale.
  - La recarga, como todas, **no se reinicia** al morir ni al cambiar de
    nivel (ya lo garantiza `limpiarEfectos`, que no toca `cd`).

---

## 2 · Reglas de juego (decididas)

1. **Solo con Tanque o Soporte = PRÁCTICA.** No entra al TOP MUNDIAL, no
   actualiza `recordsModo.hab`, no cuenta para maestrías/badges ni récord de
   tiempo. **Sí** da experiencia y logros. Mostrarlo claro: etiqueta
   `PRÁCTICA` en el HUD y en el GAME OVER. Solo con Atacante = igual que hoy.
2. **En equipo (dúo, trío, escuadra, local u online) los roles cuentan** para
   los récords de DESATADO de su formato, sin tabla aparte.
3. **Roles repetidos permitidos, salvo el Soporte: máximo uno por partida.**
   El selector lo bloquea (en party, el primero que lo coge se lo queda) y el
   anfitrión lo valida al arrancar (si llegan dos, el segundo pasa a
   Atacante).
4. **PAC-MAN VS.:** quien lleva fantasma sigue con `LIST_G`; los Pac-Man de
   una partida VS. son todos Atacante (sin selector). CACERÍA no cambia.
5. **Dos en el mismo teclado:** cada jugador elige su rol; las teclas siguen
   siendo las de `KEYS_2P`.
6. Default de un jugador que no elige: **Atacante**. El último rol elegido se
   recuerda en `settings`.

---

## 3 · Arquitectura (cómo encajarlo en lo que hay)

### Datos
- `CFG.HAB.ROLES = { atacante: LIST, tanque: LIST_T, soporte: LIST_S }` con
  el mismo formato `{ id, key, name, cd }`. `LIST` se queda como está
  (lo leen el diálogo y los textos). Constantes nuevas junto a las demás
  (`TAUNT_TICKS`, `ESCUDO_TICKS`, `PISOTON_TICKS`, `PISOTON_TILES`,
  `ARROLLAR_TILES`, `HIELO_TICKS`, `HIELO_VEL`, `INMUNE_TICKS`,
  `ESCUDO_ALIADO_TICKS`, `VIDA_MAX`). `CFG.HAB.segs(k)` pasa a recibir el rol.
- `Game.roles`: array por jugador (`'atacante' | 'tanque' | 'soporte'`),
  fijado en `newGame(opts.roles)`. `Game.practica` = solo + rol ≠ atacante.

### `js/habilidades.js`
- `listaDe(G, idx)`: fantasma humano → `LIST_G`; si no →
  `CFG.HAB.ROLES[G.roles[idx]]`. Sigue resolviéndose en cada llamada (hay un
  comentario que explica por qué no se cachea).
- `lanzar`/`peticion`/`evento`: el `switch (k)` actual pasa a despachar por
  **id** de la lista (`lista[k].id`), no por índice fijo.
- `nuevoEstado()` + `limpiarEfectos()` + `paso()`: nuevos contadores
  (`provoca`, `escudo`, `pisoton`, `arrolla`, `inmune`). `foto/ponerFoto` ya
  copian el objeto entero, así que basta con añadirlos a `nuevoEstado`.
- Estado que no es de un jugador (proyectiles vivos, congelación por
  fantasma, "huye de quién" por fantasma) va en el propio `Hab` y **debe
  entrar en `foto()`/`ponerFoto()`** o el rebobinado de las repeticiones se
  desincroniza.
- **Quién manda (online)**, siguiendo la regla existente:
  - Lo que toca fantasmas o vidas lo ejecuta el **anfitrión**: PROVOCAR,
    PISOTÓN, ARROLLAR (come fantasmas), DISPARO HELADO (el proyectil lo
    simula el anfitrión), ESCUDO ALIADO, VIDA EXTRA.
  - Lo que solo toca al propio Pac-Man se aplica en local y se anota en el
    anfitrión: ESCUDO propio, INMUNIDAD. Pero **la muerte la decide quien
    simula a ese Pac-Man** (`isLocalAuth` / predicción del invitado en el
    bucle de colisiones del invitado), así que escudo e inmunidad deben
    consultarse en **los dos** bucles de colisión de `js/game.js`: el del
    anfitrión (junto a `p.safeTicks`) y el del invitado (junto a
    `me.safeTicks`).
  - El movimiento de ARROLLAR lo simula quien lleva al Pac-Man (como FLASH);
    comer fantasmas en el recorrido lo decide el anfitrión con margen de red
    (como `BITE_NET_MARGIN`) y protección tipo `guard` en el invitado.

### Fantasmas (`js/ghost.js`)
- Congelado: velocidad 0 y sin colisión letal. Consultar `Hab` desde
  `speedPx` (ya pasa por `multVelFantasma`) y desde la colisión en `game.js`.
- PROVOCAR y PISOTÓN cambian el **objetivo**, no el modo: enganchar en
  `targetTile` (PROVOCAR = casilla del Tanque; PISOTÓN = elegir la salida que
  maximiza la distancia al Tanque). No tocar `frightened`.
- Prioridad si coinciden: congelado > huida > provocación > IA normal.
- Todo esto es determinista (sin `Math.random` fuera del RNG con semilla del
  juego) o las repeticiones se rompen.

### Red
- **Subir `CFG.NET.PROTO` a 10**: los roles viajan en el saludo/arranque de
  la party (junto a `hab`, ver `Party` `habPick` y `Game` `hostEvt`), y la
  instantánea necesita: congelaciones, proyectiles, escudos/inmunidad por
  jugador y objetivos forzados. Añadirlo como campo nuevo en `buildSnapshot`
  / `applySnapshot` como hace `hb`.
- `Hab.resumen/aplicarResumen` siguen valiendo (4 enteros por jugador; la R
  del Soporte cabe: 18.000 ticks).

### Lobby y menús
- Diálogo de DESATADO (`UI.showHabPrompt`): selector de rol para 1 y 2
  jugadores, con las cuatro habilidades del rol y sus recargas leídas de
  `CFG.HAB.ROLES` (no escribir textos a mano). Aviso visible "PRÁCTICA · NO
  CUENTA PARA RÉCORDS" cuando solo + no Atacante.
- Party online: cada miembro elige su rol en la sala cuando el líder tiene
  DESATADO; el Soporte ocupado sale deshabilitado para el resto.
- Barra de teclas (`#habBar`, `UI.refreshHabBar`, filas `.hab-otro` de los
  compañeros): nombres y recargas por rol; icono/color de rol junto al nombre.
- Reutilizar el `desplegable` de recreativa o los chips existentes; mirar el
  sistema visual del juego antes de inventar componentes.

### Récords, logros y nube
- Práctica: cortar en los mismos sitios que ya cortan `this.hab` para
  `canTimeRecord`/`submitRanking`, y además no escribir `recordsModo`, ni
  `Game.rankPendiente`, ni maestrías (`js/badges.js`, `js/stats.js`).
- **⚠️ Techo del servidor:** la función `enviar-record` calcula el máximo
  posible de DESATADO sumando mordiscos (cada 16 s) y gritos (cada 60 s) por
  jugador. ARROLLAR también come fantasmas y el hielo facilita mordiscos:
  una partida de equipo legítima podría ser **rechazada**. Sumar ARROLLAR
  (cada 60 s, hasta 4 fantasmas) por jugador al techo y **redesplegar la
  función** (Supabase principal del proyecto; el token está en el historial
  local según la memoria del proyecto — no dejar SQL ni pasos para Braighton).
  Enviar los roles con el récord para poder auditar.
- Logros: sin logros nuevos en esta tarea (se propondrán aparte). Contadores
  de uso por habilidad sí, porque luego alimentan CIFRAS (regla del proyecto:
  un contador nuevo se siembra con el historial, aquí empieza en 0 porque no
  hay historial).

### Repeticiones y partida guardada
- La cabecera de la repetición guarda `roles` (`js/replay.js`, donde ya va
  `hab`, y el validador que hoy asume `e[2] > 3` solo en `hab`).
- Las repeticiones viejas sin `roles` = todos Atacante.
- `js/guardado.js` (partida a medias) guarda y restaura roles y el estado
  nuevo de `Hab`.

---

## 4 · Orden de trabajo (con puerta de verificación en cada paso)

1. **Datos + despacho por id**, sin roles nuevos todavía. Verificar:
   `tests.html` igual que antes (hoy 357/357) y una repetición vieja de
   DESATADO se reproduce idéntica.
2. **Tanque en solo local** (4 poderes). Pruebas nuevas en `js/tests.js`:
   PROVOCAR cambia objetivos 3 s; ESCUDO absorbe exactamente un golpe;
   PISOTÓN no pone azules ni permite comer; ARROLLAR se para en pared y come.
3. **Soporte en solo local.** Pruebas: el disparo congela al primero y a los
   de su casilla; congelado no mata y se puede morder; sin blanco gasta
   recarga; INMUNIDAD 2 s; ESCUDO ALIADO no sale en solo; VIDA EXTRA respeta
   el tope y la recarga de 5 min sobrevive a morir y a pasar de nivel.
4. **Práctica y récords.** Pruebas: solo+Tanque no toca récord, ranking ni
   maestrías pero suma XP; dúo con Soporte sí cuenta.
5. **Dos en el mismo teclado + regla de un Soporte.**
6. **Online.** PROTO 10, sala con selector, instantánea. Probar con el arnés
   de varios mundos en Node (cargar `pruebas-node.js` N veces y cablear
   `PM.Net.gameSend`, entregando mensajes **en orden**): party de 3 con
   Tanque + Soporte + Atacante, retardo simulado, sin divergencias entre
   anfitrión e invitados en congelación, escudos y vidas.
7. **Repeticiones y rebobinado** de una partida con los tres roles: la
   reproducción acaba con la misma puntuación y el rebobinado a mitad de un
   hielo/escudo coincide.
8. **Servidor:** techo de `enviar-record` actualizado y desplegado; probar un
   envío de equipo con muchos ARROLLAR que antes habría sido rechazado.
9. **UI en móvil** (Playwright a 390 px): selector de rol, barra y filas de
   compañeros sin tapar el juego.

Criterio de terminado: `tests.html` con **0 fallos** en Chromium (servir con
Node, no con el `python` del PATH; el service worker sirve el juego viejo si
no hay servidor) y `node pruebas-node.js` con solo los **2 fallos conocidos**
del DOM de mentira.

## 5 · Cierre
- Subir la versión del service worker (`sw.js`, hoy `pm-v120`).
- `CHANGELOG.md` (para jugadores), `SPEC.md` (sección de DESATADO ampliada),
  `PENDIENTE.md` (entrada del día con lo decidido y lo "por mirar": balance de
  recargas tras jugar, probar party real con dos aparatos).
- Commit y despliegue solo cuando Braighton lo pida.

## 6 · Abierto a propósito (no decidir sin Braighton)
- Balance fino de números (3 s, 4 casillas, tope de 5 vidas) tras jugarlo.
- Logros y maestrías propias de cada rol.
- Iconos/arte de los roles: proponer 2–3 opciones antes de fijarlos.
