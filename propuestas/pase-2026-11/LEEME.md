# Pase de temporada — noviembre 2026 (DÍA DE MUERTOS) — propuesta

Las **cinco piezas exclusivas** del camino del pase de noviembre. Sin ellas,
ese mes el pase solo paga monedas (`CFG.PASE.PIEZAS` no tiene entrada
`'2026-11'`). **Todavía NO están en el juego: falta que Braighton las
apruebe.** Hay que tenerlas dentro antes del 24 de octubre.

Escaparate publicado: <https://claude.ai/artifact/TUTZA8gaMDpHHTtRuUzGwY>

## Qué propone

Tema: **Día de Muertos**. El 1 y el 2 de noviembre los difuntos vuelven de
visita; en un juego de fantasmas es la fiesta que toca, y no pisa lo de
octubre (cazafantasmas) ni lo de halloween, que se gana gratis esa semana.

Mismo reparto de tipos y carriles que octubre:

| galón | carril | pieza |
| --- | --- | --- |
| 10 | gratis | **CALAVERITA** (emote) |
| 10 | pago | **SOMBRERO CATRINA** (accesorio, a la cabeza) |
| 20 | pago | **VELITAS** (efecto) |
| 30 | gratis | **CEMPASÚCHIL** (accesorio, a la cara: detrás de la oreja) |
| 30 | pago | **ALEBRIJE** (skin extravagante, con su Q y su muerte) |

- **ALEBRIJE:** medio gato, medio dragón, alas de mariposa y cola en espiral,
  pintado a lunares y rayas; la cara lleva el color del jugador y el hocico es
  la boca. Q: se abren las alas, la pintura baila y echa chispas de colores.
  Muerte: se destiñe a madera, se raja y cae en seis trozos.
- **SOMBRERO CATRINA:** ala enorme con encaje, cinta del color del jugador,
  ramillete delante y pluma que se mece.
- **CEMPASÚCHIL:** la flor naranja detrás de la oreja; gira y suelta pétalos.
- **VELITAS:** velas encendidas en el suelo que se consumen y se apagan con
  humo; una de cada tres, del color del jugador.
- **CALAVERITA:** la cara se vuelve calaverita de azúcar y castañetea riéndose.

## Los archivos

Reaprovecha el escaparate de octubre (`../pase-2026-10/`): de allí salen la
hoja de estilos, las medidas y primitivas (`p-base.js`), los ayudantes
(`p-helpers.js`: globo, rastro, motor de muertes) y el pasillo (`p-motor.js`).

| archivo | qué lleva |
| --- | --- |
| `p-html.html` | cabecera, la tabla del camino y las secciones |
| `p-piezas.js` | **las cinco piezas**, escritas como las quiere el juego (`DRAW.alebrije`, `ACC.id`, `EFX.id(ctx, o, cuerpo)`, `caraMuertos`) y el puente a la vitrina |
| `p-muerte.js` | la muerte del ALEBRIJE |
| `p-cat.js` | el catálogo (carril, galón y textos) |
| `build.js` | monta `vitrina-pase.html` (lo publicado) |
| `render-pase.html` | hoja de contacto en grande, sin servidor |

```sh
node build.js        # vitrina-pase.html listo para publicar
```

Mirar de cerca, con el Chromium de Playwright:

```sh
CHROME="$LOCALAPPDATA/ms-playwright/chromium-1243/chrome-win64/chrome.exe"
DIR=$(pwd -W)
"$CHROME" --headless --disable-gpu --allow-file-access-from-files \
  --force-device-scale-factor=1 --window-size=1840,620 \
  --virtual-time-budget=1500 --screenshot="$DIR/alebrije.png" \
  "file:///$DIR/render-pase.html?id=alebrije&ts=1.5,2.0,3.6,4.0,5.9,6.4&fs=0,2,2,2,0,0&k=9"
```

`ts` son los instantes (la Q sale en los primeros 1,2 s de cada 3,4; la muerte
entre 5,3 y 6,8), `fs` la fase de la boca, `k` la escala, `c` el color
(`%23ff0000`); `id` admite varias separadas por comas.

## Al portar al juego (cuando las apruebe)

- Q: `qFase(t, 3.4, 1.2)` → `qDe(o, 1.2)`.
- `rastro` y `PAL_MUERTOS`/`cempasuchil` : el primero ya existe en js/skins.js;
  los otros dos van con el bloque.
- Declararlas en js/config.js como las de octubre (skin `grupo: 'pase'`,
  `rara: true`, `temporada: '2026-11'`; el resto `pase: true, precio: 0`),
  colgarlas en `CFG.PASE.PIEZAS['2026-11']` y darles su temporada en
  `piezas_especiales` del servidor.
- ALEBRIJE necesita `CABEZAS` y `POSES` (bota con `|sin(7t)|·0,3` y salta
  con la Q; la mandíbula gira sobre (0,4; 0,1) con [0, 18, 34] grados).
- SOMBRERO CATRINA va a la `cabeza` (BASE_SOMBRERO ≈ R − 1); CEMPASÚCHIL, a la
  cara.
- La calaverita va con las caras de la tienda (`caraEmote`, `CARAS_TIENDA`).
