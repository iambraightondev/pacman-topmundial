# Pase de temporada — diciembre 2026 (FIN DE AÑO) — propuesta

Las **cinco piezas exclusivas** del camino del pase de diciembre. Sin ellas,
ese mes el pase solo paga monedas (`CFG.PASE.PIEZAS` no tiene entrada
`'2026-12'`). **Todavía NO están en el juego: falta que Braighton las
apruebe; hay que tenerlas dentro antes del 24 de noviembre.**

Escaparate publicado: <https://claude.ai/artifact/NyxQSYiSuqxNkpCVyX5YNJ>

## Qué propone

Tema: **FIN DE AÑO a la latina**. No es la Navidad: esa ya la regala gratis
CLAUS-MAN (`gorro`, del 20 de diciembre al 6 de enero), y el pase no puede
venderle a nadie lo que ya se regala. Es la noche del 31 de aquí: se quema el
año viejo, se comen las doce uvas, se da la vuelta a la manzana con la maleta
y revientan los cohetes. Sigue el guiño latino que gustó en noviembre.

Mismo reparto de tipos y carriles que octubre y noviembre:

| galón | carril | pieza |
| --- | --- | --- |
| 10 | gratis | **DOCE UVAS** (emote) |
| 10 | pago | **LENTES 2027** (accesorio, a la cara) |
| 20 | pago | **COHETES** (efecto) |
| 30 | gratis | **MALETA** (accesorio, a la espalda) |
| 30 | pago | **AÑO VIEJO** (skin extravagante, con su Q y su muerte) |

- **AÑO VIEJO:** el muñeco de trapo relleno de paja, a parches (uno del color
  del jugador), ojo de botón, sombrero de paja roto y el cartel del 2026. La
  mandíbula de trapo es la boca. Q: se enciende la mecha del sombrero y
  revientan los petardos. Muerte: arde de abajo arriba, se queda en ceniza,
  se hunde y el viento se lleva las pavesas.
- **LENTES 2027:** las cifras doradas con purpurina; el cero es el cristal.
- **MALETA:** de cuero, con pegatinas y etiqueta del color del jugador; bota.
- **COHETES:** suben desde la estela y revientan en palmeras de colores.
- **DOCE UVAS:** se las mete a toda prisa, con los mofletes a reventar.

## Los archivos

Reaprovecha el escaparate de octubre (`../pase-2026-10/`: estilos, medidas,
primitivas, ayudantes, pasillo) como el de noviembre.

| archivo | qué lleva |
| --- | --- |
| `p-html.html` | cabecera, la tabla del camino y las secciones |
| `p-piezas.js` | **las cinco piezas**, escritas como las quiere el juego (`DRAW.anoviejo`, `ACC.id`, `EFX.id(ctx, o, cuerpo)`, `caraFinDeAno`) y el puente a la vitrina |
| `p-muerte.js` | la muerte del AÑO VIEJO |
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
  --virtual-time-budget=1500 --screenshot="$DIR/anoviejo.png" \
  "file:///$DIR/render-pase.html?id=anoviejo&ts=1.5,2.0,3.6,4.0,5.9,6.4&fs=0,2,2,2,0,0&k=9"
```

## Al portar al juego (cuando las apruebe)

- Q: `qFase(t, 3.4, 1.2)` → `qDe(o, 1.2)`.
- `PAL_FIN`, `llamarada` y `petardo` van con el bloque (comprobar que no
  chocan con nombres de js/skins.js); `rastro` ya existe allí.
- El cartel del AÑO VIEJO pinta «2026» con `fillText` (fuente del sistema,
  como el 福 del DARUMA).
- Declararlas en js/config.js como las de noviembre (skin `grupo: 'pase'`,
  `rara: true`, `temporada: '2026-12'`; el resto `pase: true, precio: 0`; el
  emote con id `uvas`), colgarlas en `CFG.PASE.PIEZAS['2026-12']` y darles su
  temporada en `piezas_especiales` del servidor.
- AÑO VIEJO necesita `CABEZAS` y `POSES` (bota con `|sin(6t)|·0,25 − 0,12`,
  respinga con la Q; la mandíbula gira sobre (−4,6; −1,0) con [0, 16, 30]
  grados). Su sombrero es parte del dibujo: los sombreros del vestuario van
  encima (coronilla ≈ la copa).
- LENTES 2027 va a la cara (lista CARA de la prueba del vestuario); MALETA, a
  la espalda (zona `cuello`, como la katana).
