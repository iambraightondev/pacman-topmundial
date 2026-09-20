# Pase de temporada — octubre 2026 (CAZAFANTASMAS) — propuesta

Las **cinco piezas exclusivas** que le faltan al pase para poder venderse
(ver `PENDIENTE.md` → *Lo que falta del PASE*, punto 1). **Todavía NO están en
el juego**: esto es el escaparate con el que Braighton decide qué entra, qué se
retoca y qué se descarta.

Escaparate publicado: <https://claude.ai/artifact/GX82VpW7V8MZW7K7nWTCxG>

Está aquí, en el repo, porque el directorio temporal donde se construyó muere
con la sesión.

## Qué propone

Tema de la temporada: **cazar fantasmas**, que es lo único que hace el juego.
Deliberadamente NO es «halloween»: las de halloween (CALABAZA, NOCHE DE BRUJAS,
VAMPIRO, HOMBRE LOBO) ya se ganan gratis jugando esa semana, y si el pase
vendiera lo mismo se pisarían.

| galón | carril | pieza |
| --- | --- | --- |
| 10 | gratis | **GRITO** (emote) |
| 10 | pago | **MOCHILA DE PROTONES** (accesorio) |
| 20 | pago | **ECTOPLASMA** (efecto) |
| 30 | gratis | **VISOR DE CAZA** (accesorio) |
| 30 | pago | **TRAMPA** (skin extravagante, con su Q y su muerte) |

El reparto: quien juega gratis termina el mes con dos piezas que se ven, para
que la temporada no le pase de largo; quien paga se lleva la skin, que es lo
único que de verdad se compra. El galón 20 solo paga pieza en el carril de
pago —con candado a la vista todo el mes— porque es a dos tercios del camino
donde se decide comprar.

## Los archivos

La vitrina se monta concatenando las partes **en este orden**:

```sh
cat p-css.html p-html.html p-base.js p-helpers.js p-piezas.js \
    p-muerte.js p-cat.js p-motor.js > vitrina-pase.html
```

| archivo | qué lleva |
| --- | --- |
| `p-css.html` | título y hoja de estilos (heredada de la vitrina del 18 sep) |
| `p-html.html` | cabecera, la tabla del camino y las secciones |
| `p-base.js` | medidas del juego y primitivas de dibujo |
| `p-helpers.js` | globo de emote, rastro, envoltorio de accesorio y el motor de muertes |
| `p-piezas.js` | **las cinco piezas** |
| `p-muerte.js` | la muerte de la TRAMPA |
| `p-cat.js` | el catálogo (carril, galón y textos) |
| `p-motor.js` | el pasillo, la lupa y los controles |
| `render-pase.html` | dibuja UNA pieza en grande, para mirarla de cerca |

### Ver una pieza de cerca

Con el Chromium de Playwright, sin servidor:

```sh
CHROME="$LOCALAPPDATA/ms-playwright/chromium-1237/chrome-win64/chrome.exe"
DIR=$(pwd -W)
"$CHROME" --headless --disable-gpu --hide-scrollbars \
  --force-device-scale-factor=1 --window-size=496,372 \
  --virtual-time-budget=1200 --screenshot="$DIR/trampa.png" \
  "file:///$DIR/render-pase.html?id=trampa&t=2.0&f=2&k=22&cx=210&cy=190"
```

`id` es la pieza, `t` el instante (la Q sale cada 3,4 s y la muerte a los 5,3),
`f` la fase de la boca (0 cerrada, 2 abierta), `k` la escala y `cx`/`cy` dónde
se planta.

## Lo que costó, por si se retoca

Las **hojas de la TRAMPA** llevaron tres vueltas: colgadas del centro del
frente parecían aspas y cruzaban por delante de la boca. Cuelgan del **borde**
de la caja (pivote en `s = ±4.6`) y giran hacia fuera: así se levantan y dejan
el hueco a la vista. El **ECTOPLASMA** con paso 6 salía como óvalos sueltos;
con paso 3,4 y radio 3 se solapan y parece un reguero.

## Dónde se quedó

**Braighton todavía no ha dicho qué entra.** Hasta que lo diga, nada de esto se
toca en `js/skins.js`, `js/sprites.js`, `js/config.js` ni en `CFG.PASE.CAMINO`.

Cuando lo diga, el trabajo es: pasar los dibujos a `js/skins.js`, declarar las
piezas en `js/config.js` (con su grupo `temporada`, que NO se compran ni salen
de cofre) y colgarlas en `CFG.PASE.CAMINO` por su id — `Pase.sincronizar()` ya
las entrega solo, y hay una prueba que avisa si se pone un id que no está en el
vestuario.
