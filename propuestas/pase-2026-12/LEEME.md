# Pase de temporada — diciembre 2026 (NAVIDAD PERUANA) — propuesta

Las **cinco piezas exclusivas** del camino del pase de diciembre. Sin ellas,
ese mes el pase solo paga monedas (`CFG.PASE.PIEZAS` no tiene entrada
`'2026-12'`). **Todavía NO están en el juego: falta que Braighton las
apruebe; hay que tenerlas dentro antes del 24 de noviembre.**

Escaparate publicado: <https://claude.ai/artifact/NyxQSYiSuqxNkpCVyX5YNJ>

## Qué propone

Tema: **Navidad a la peruana**. Navidad, pero la de aquí y no la del Polo
Norte: el gorro de Papá Noel ya lo regala CLAUS-MAN (`gorro`, del 20 de
diciembre al 6 de enero) y el pase no puede venderle a nadie lo que ya se
regala. Así que ni Papá Noel, ni renos, ni muñecos de nieve: el retablo
ayacuchano con su nacimiento, la chocolatada con panetón, los foquitos del
balcón y la estrella de Belén.

Mismo reparto de tipos y carriles que octubre y noviembre:

| galón | carril | pieza |
| --- | --- | --- |
| 10 | gratis | **CHOCOLATADA** (emote) |
| 10 | pago | **PANETÓN** (accesorio, a la cabeza) |
| 20 | pago | **FOQUITOS** (efecto) |
| 30 | gratis | **ESTRELLA DE BELÉN** (accesorio, flotando sobre la cabeza) |
| 30 | pago | **RETABLO** (skin extravagante, con su Q y su muerte) |

- **RETABLO:** el cajón ayacuchano de techo a dos aguas, pintado de flores,
  con la madera del color del jugador; dentro, en su nicho azul, la Virgen,
  San José, el Niño en el pesebre y una llamita. El cajón de abajo es la
  boca. Q: se enciende por dentro, sale la estrella por el techo y suena el
  villancico. Muerte: se le va la luz, se desarma en tablas, las figuritas
  saltan fuera y la estrella se apaga la última.
- **PANETÓN:** entero en la cabeza, con frutas confitadas, pasas, el molde
  de papel del color del jugador y un hilito de vapor.
- **ESTRELLA DE BELÉN:** flota con su resplandor y su cola de cometa; titila.
- **FOQUITOS:** una tira de foquitos de colores colgando de su cable, que se
  encienden por turnos.
- **CHOCOLATADA:** sopla la taza, sorbe y se queda con el bigote de chocolate.

**Descartado (30 sep):** una primera versión con tema FIN DE AÑO (AÑO VIEJO,
LENTES 2027, MALETA, COHETES y DOCE UVAS). Braighton la quería más navideña,
así que se rehízo entera con este tema y en el mismo enlace. Está en la
historia de git (commit 3192a92) por si algún día sirve para un pase de enero.

## Los archivos

Reaprovecha el escaparate de octubre (`../pase-2026-10/`: estilos, medidas,
primitivas, ayudantes, pasillo) como el de noviembre.

| archivo | qué lleva |
| --- | --- |
| `p-html.html` | cabecera, la tabla del camino y las secciones |
| `p-piezas.js` | **las cinco piezas**, escritas como las quiere el juego (`DRAW.retablo`, `ACC.id`, `EFX.id(ctx, o, cuerpo)`, `caraNavidad`) y el puente a la vitrina |
| `p-muerte.js` | la muerte del RETABLO |
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
  --virtual-time-budget=1500 --screenshot="$DIR/retablo.png" \
  "file:///$DIR/render-pase.html?id=retablo&ts=1.5,2.0,3.6,4.0,5.9,6.4&fs=0,2,2,2,0,0&k=9"
```

## Al portar al juego (cuando las apruebe)

- Q: `qFase(t, 3.4, 1.1)` → `qDe(o, 1.1)`.
- `PAL_NAVI`, `estrella5` y `florcita` van con el bloque (comprobar que no
  chocan con nombres de js/skins.js); `rastro`, `nota` y `estrella4` ya
  existen allí.
- Declararlas en js/config.js como las de noviembre (skin `grupo: 'pase'`,
  `rara: true`, `temporada: '2026-12'`; el resto `pase: true, precio: 0`; el
  emote con id `chocolatada`), colgarlas en `CFG.PASE.PIEZAS['2026-12']` y
  darles su temporada en `piezas_especiales` del servidor.
- RETABLO necesita `CABEZAS` (sin ojo: manda el centro del nicho, ≈ (0,1; 1,4),
  como la RECREATIVA; coronilla en la punta del techo, ≈ (0,1; 6,9)) y `POSES`
  (bota con `|sin(6t)|·0,2 − 0,1`; la mandíbula gira sobre (−4,7; −1,0) con
  [0, 16, 30] grados, `mandibulaM`).
- PANETÓN va a la `cabeza` (BASE_SOMBRERO ≈ R − 1); ESTRELLA DE BELÉN también
  (flota: como la AUREOLA, ≈ R + 1,8).
