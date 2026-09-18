# Plan · Cofres de premios

Diseño acordado con Braighton el 17 sep 2026. **Falta por diseñar el
contenido exclusivo de cofre** (se hará en otra sesión); todo lo demás está
decidido y se puede implementar ya con el Legendario provisional de §2.

Antes de tocar nada, leer: `PENDIENTE.md` (arriba), la cabecera de
`js/tienda.js` (cómo se guardan monedas y compras), `CFG.TIENDA` y los
catálogos de tienda en `js/config.js`, y cómo `Achievements.merge` junta dos
aparatos.

---

## 1 · Por qué

Hoy las monedas llegan a goteo (5–40 por partida, 20 por reto del DAILY, 150
por la semana). El cofre añade sorpresa y, más adelante, contenido que **no se
puede comprar**.

## 2 · Los cofres (decidido)

| Cofre | Cómo se gana | Qué trae |
|---|---|---|
| **MADERA** | Cada **5 partidas de más de 1 minuto** | 30–80 monedas **o** un emote de tienda |
| **PLATA** | **Semana del DAILY completa** · **subir de nivel de jugador** | 100–250 monedas · efecto **o** accesorio |
| **ORO** | **Maestría nueva** · **récord propio** (con los 3 filtros de §3) | Accesorio asegurado, con opción a skin de tienda |
| **LEGENDARIO** | **2 % de probabilidad** de que un ORO, al abrirse, se convierta en Legendario · **top 3 al cerrar temporada** | Exclusivo de cofre. **Provisional** hasta que existan: una skin de tienda asegurada + 500 monedas |

Probabilidades exactas dentro de cada cofre: a criterio de quien implemente,
dentro de esos rangos, en `CFG.COFRES` y comentadas. Proponer por defecto:
MADERA 70 % monedas / 30 % emote; PLATA 60 % monedas / 40 % efecto o
accesorio; ORO 100 % accesorio + 15 % skin de tienda además.

## 3 · Reglas (decididas)

1. **Récord propio da ORO solo si pasa los tres filtros:**
   - mejora el récord anterior en **al menos un 10 %**;
   - el récord anterior ya era de **10.000 puntos o más** (así no cuentan las
     rutas nunca jugadas, donde cualquier partida es récord);
   - **como máximo un ORO por récord (ruta) al día.**
   Las maestrías nuevas dan ORO sin filtros.
2. **Nada se pierde por repetido:** si sale algo que ya tienes, se convierte
   en monedas por **la mitad de su precio** de tienda.
3. **Seguro de mala suerte:** si pasan **10 PLATAS seguidas sin efecto ni
   accesorio**, la siguiente lo trae seguro.
4. **Solo apariencia y monedas.** Nada que dé ventaja en partida (ni vidas,
   ni poderes, ni multiplicadores de puntos): no se ensucian los récords.
5. **Los cofres NO se compran con monedas.** Solo se ganan jugando; si se
   vendieran, la tienda sobraría.
6. Premios del modo PRÁCTICA de DESATADO (ver `PLAN-ROLES.md`): las partidas
   sí cuentan para MADERA (son partidas), pero un "récord" de práctica no da
   ORO porque no es récord.

## 4 · Arquitectura

### El riesgo que manda en el diseño
Todo lo ganado vive como **contadores que solo crecen** en
`PM.Achievements`, y juntar dos aparatos se queda con **el mayor de cada
lado**. Un cofre abierto "al azar del momento" en el móvil y el mismo en el PC
darían premios distintos que no se pueden juntar, y permitiría repetir la
tirada recargando.

**Solución obligatoria: el contenido es determinista.** El premio del cofre
número `n` del tipo `t` sale de una semilla `hash(cuenta | t | n)` (sin
cuenta: el id de este aparato). Mismo cofre ⇒ mismo premio en cualquier
aparato, y recargar no cambia nada. Lo mismo para el 2 % de Legendario y el
seguro de mala suerte (se recalcula recorriendo la secuencia).

### Qué se guarda
Seguir el patrón de la tienda: nada de tabla nueva en la nube.
- **Ganados**: siempre que se pueda, **derivados** de contadores que ya
  existen (partidas largas / 5, semanas DAILY completas, nivel de jugador,
  número de maestrías). Lo que no se pueda derivar (récords que pasan los
  filtros, top 3 de temporada) es un contador nuevo que solo crece.
- **Abiertos**: un contador por tipo (`cofre_madera`, …). Pendientes =
  ganados − abiertos.
- **Premios**: al abrir se aplica como hoy — monedas con `Tienda.ganar`,
  objetos con `c_<id> = 1` —, así el saldo y "lo tuyo" siguen funcionando sin
  cambios.
- Comprobar si existe un contador de "partidas de más de 1 minuto"; si no,
  crearlo **sembrado con el historial** (regla del proyecto: un contador nuevo
  no empieza a cero si el jugador ya lo había logrado).

### Pantallas
- Aviso al ganar un cofre en el resumen del GAME OVER ("+1 COFRE DE PLATA"),
  sin tapar logros ni subida de nivel (respetar la cola de celebraciones).
- Un sitio para **ver y abrir** los pendientes (junto a la TIENDA es lo
  natural). Animación de apertura con el color del cofre y el premio a la
  vista; si fue repetido, enseñar la conversión a monedas.
- Punto/contador en el menú cuando hay cofres sin abrir.
- Proponer 2–3 aspectos de la pantalla de apertura a Braighton antes de
  fijar uno (así se ha hecho con la tienda y el reproductor).

### Party
Cada jugador gana y abre **sus** cofres en su aparato; nada viaja por red.

## 5 · Orden de trabajo (con verificación)

1. `CFG.COFRES` + generador determinista. Pruebas: el mismo cofre da el mismo
   premio siempre; la distribución de 10.000 cofres simulados cae en los
   porcentajes; el seguro salta a la 11.ª PLATA; el 2 % de Legendario ronda
   el 2 %.
2. Ganados y abiertos sobre contadores. Pruebas: juntar dos aparatos que
   abrieron el mismo cofre no duplica monedas ni objetos; los tres filtros
   del récord (9 % no da, 12 % sí, récord previo de 9.000 no da, dos récords
   el mismo día en la misma ruta dan uno).
3. Repetidos → mitad de precio. Prueba con un objeto ya comprado.
4. Pantalla de cofres + aviso en GAME OVER + marca en el menú.
5. Top 3 de temporada → LEGENDARIO (mirar `js/temporadas.js` y cómo se
   decide el cierre; si solo lo sabe el servidor, avisar antes de montar
   nada en Supabase).

Criterio de terminado: `tests.html` con **0 fallos** en Chromium (servir con
Node) y `node pruebas-node.js` con solo los 2 fallos conocidos. Panel nuevo:
añadirlo también a la lista de paneles de `pruebas-node.js` y a `tests.html`.

## 6 · Cierre
Versión del service worker, `CHANGELOG.md`, `SPEC.md` y `PENDIENTE.md`.
Commit y despliegue solo cuando Braighton lo pida.

## 6 bis · El premio ya existe (17 de septiembre de 2026, noche)

Braighton pidió llenar el vestuario ANTES de montar los cofres: con 33 objetos
en el bote y solo 5 skins comprables, el premio no daba para una economía. Se
diseñaron en el artifact (canvas `Vestuario nuevo · 25 piezas`,
<https://claude.ai/artifact/CSgcCAFHmoJPUXNNyP6PDB>) y ya están **hechas y en
producción** (`pm-v172`): 7 skins de material, 7 accesorios, 6 efectos y 5
emotes. El bote pasa a **58 objetos**.

Ocho son **exclusivas de cofre** y hoy se ven cerradas porque nada las abre:

| Pieza | Tipo | Para qué cofre |
|---|---|---|
| AGUJERO NEGRO | skin | LEGENDARIO (ya no hace falta el premio provisional de §2) |
| PLASMA, ENJAMBRE, GALAXIA | skins | ORO (la línea de skin del 15 %) |
| AUREOLA, ALITAS | accesorios | ORO |
| PORTALES, CONSTELACIÓN | efectos | PLATA |

Cómo está montado (para el paso 2 del orden de trabajo): se poseen por el
mismo contador `c_<id>` que una compra, así que **abrir un cofre es subir ese
contador**; `Tienda.VENTA` es lo que se vende y deja fuera lo de cofre;
`Tienda.esDeCofre(id)` lo distingue; las skins usan `grupo: 'cofre'` y
`Skins.estado` les pone su etiqueta. Nada más hay que tocar para entregarlas.

## 7 · Abierto (no decidir sin Braighton)
- **Cofres retroactivos:** quien ya tiene niveles y maestrías, ¿recibe todos
  esos cofres de golpe? Riesgo: decenas de cofres el primer día y la
  economía rota. Recomendación de Jarvis: un **regalo de bienvenida
  pequeño** (p. ej. 1 PLATA + 1 ORO) y contar solo desde el lanzamiento.
- Ajuste fino de rangos y porcentajes tras una semana de datos.
