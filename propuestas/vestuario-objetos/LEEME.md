# Vestuario de OBJETOS — propuesta (19 sep 2026)

Las **26 piezas** de la segunda tanda. Braighton eligió el rumbo: *menos
bichos, más objetos*, en la línea de RECREATIVA. **Todavía NO están en el
juego.**

Escaparate publicado: <https://claude.ai/artifact/6Z9ycywGi3Ng88RTVyZ1Xi>

## Qué hay

**8 skins · 1.500** — cosas con vida propia. Cada una deja la silueta de
Pac-Man, convierte el comer en el gesto del objeto, tiene su Q y su muerte.

| skin | la boca es | de dónde sale |
| --- | --- | --- |
| MÁQUINA DE DISCOS | la ranura de los vinilos | cofre |
| TELEVISOR | la mitad de abajo de la pantalla | cofre |
| CABINA TELEFÓNICA | la puerta | cofre |
| CÁMARA DE FOTOS | la tapa del carrete | tienda |
| DESPERTADOR | la media esfera de abajo | tienda |
| SEMÁFORO | la luz verde | tienda |
| CAJA FUERTE | la puerta blindada | tienda |
| BOLA DE DISCOTECA | un gajo de espejos | tienda |

**7 accesorios · 450** — GAFAS 3D, CORONA, BOINA, MONÓCULO y CASCO DE MOTO en
la tienda; CASCO DE ASTRONAUTA y CADENA DE ORO de cofre.

**6 efectos · 250** — BURBUJAS, NEÓN, POLAROIDS y TICKETS en la tienda; GLITCH
y CINTA DE CASETE de cofre.

**5 emotes · 150** — ALUCINADO, PENSANDO, CORAZÓN ROTO, APLAUSO y CHIST.

## Los archivos

| archivo | qué lleva |
| --- | --- |
| `o-skins.js` + `o-skins2.js` | las ocho skins y su Q (cuatro en cada uno) |
| `o-muertes.js` | las ocho muertes |
| `o-resto.js` | accesorios, efectos y emotes |
| `o-cat.js` | el catálogo: precio, de cofre o de tienda, y los textos |
| `o-cat.js` → `CAT` | lo que se lee en cada tarjeta del escaparate |
| `build.js` | monta `vitrina.html` con todo esto |
| `render2.html` | dibuja UNA pieza en grande |
| `piezas.js` | primitivas compartidas |

**El resto está escrito ya como lo quiere el juego**: los accesorios como
`ACC.id = function (ctx, o)` y los efectos como
`EFX.id = function (ctx, o, cuerpo)`. El escaparate los enchufa con un puente
(ver `build.js`), así que el día que entren al juego no hay que reescribirlos.

## Cómo se rehace

```sh
node build.js        # deja vitrina.html listo para publicar
```

`build.js` se apoya en `../vestuario-2026-09-18/vitrina.html`: de aquella se
quedan la página, las primitivas, el motor de las muertes y la vitrina; solo
se le cambian las piezas y el catálogo. Si esa desaparece, esto no monta.

Para mirar una pieza de cerca, con el Chromium de Playwright:

```sh
CHROME="$LOCALAPPDATA/ms-playwright/chromium-1237/chrome-win64/chrome.exe"
DIR=$(pwd -W)
"$CHROME" --headless --disable-gpu --hide-scrollbars \
  --force-device-scale-factor=1 --window-size=496,372 \
  --virtual-time-budget=1200 --screenshot="$DIR/reloj.png" \
  "file:///$DIR/render2.html?id=reloj&t=2.0&k=22&cx=210&cy=210"
```

## Dónde se quedó

Dibujadas las 26 y publicado el escaparate. **Falta que Braighton las vea y
diga cuáles entran.** Hasta entonces no se toca `js/skins.js` ni la tienda.
