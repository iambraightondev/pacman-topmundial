# Vestuario del 18 de septiembre de 2026 — propuesta

Las **26 piezas** de la tanda "extravagante", tal y como se le enseñaron a
Braighton. **Todavía NO están en el juego**: esto es el escaparate con el que
decide cuáles entran, cuáles se retocan y cuáles se descartan.

Escaparate publicado (la misma página, por sus dos direcciones):

- <https://claude.ai/artifact/4xsGc4bTiqAyNDpZ28B4Rk>
- <https://claude.ai/code/artifact/20184d7f-a037-40fb-913d-feb53f81ef27>

Está aquí, en el repo, porque el directorio temporal donde se construyó muere
con la sesión que lo hizo y con él se irían los dibujos.

## Qué hay

**8 skins · 1.500** — extravagantes de verdad: dejan la silueta de Pac-Man,
cada una convierte el comer en su propio gesto, enseña su Q cada 3,4 s y tiene
su propia muerte.

| skin | de dónde sale |
| --- | --- |
| CÓNDOR | cofre |
| TORO | cofre |
| UNICORNIO | cofre |
| RANA | tienda |
| PAYASO | tienda |
| RECREATIVA | tienda |
| CANGREJO | tienda |
| CARACOL | tienda |

**7 accesorios · 450** — CHULLO, MOHICANO, SOMBRERO VAQUERO, OREJAS DE GATO y
GAFAS DE BUCEO en la tienda; MÁSCARA DE LUCHADOR y FLOTADOR DE PATITO de cofre.

**6 efectos · 250** — PÍXELES, ONDAS, MARIPOSAS y FRUTAS en la tienda;
FANTASMITAS y OJOS de cofre.

**5 emotes · 150** — SILBANDO, PLIS, AMBICIOSO, NERVIOS y ARCOÍRIS.

## Los archivos

| archivo | qué lleva |
| --- | --- |
| `v-skins.js` | las ocho skins y su Q |
| `v-muertes.js` | las ocho muertes |
| `v-resto.js` | emotes, efectos y accesorios |
| `v-ui.js` | el catálogo (precios, de cofre o de tienda) y el dibujo del escaparate |
| `v-html.html` | cabecera y secciones de la página |
| `piezas.js` | primitivas compartidas por el renderizador suelto |
| `vitrina.html` | la página entera, ya montada: **es lo que está publicado** |
| `build-vitrina.js` | la monta desde las partes (necesita el HTML original como argumento) |
| `render2.html` | dibuja UNA pieza en grande, para mirarla de cerca |

### Ver una pieza de cerca

Con el Chromium de Playwright, sin servidor:

```sh
CHROME="$LOCALAPPDATA/ms-playwright/chromium-1237/chrome-win64/chrome.exe"
DIR=$(pwd -W)
"$CHROME" --headless --disable-gpu --hide-scrollbars \
  --force-device-scale-factor=1 --window-size=496,372 \
  --virtual-time-budget=1200 --screenshot="$DIR/toro.png" \
  "file:///$DIR/render2.html?id=toro&t=2.0&k=22&cx=190&cy=220"
```

`id` es la skin, `t` el instante (para pillar la Q), `k` la escala y `cx`/`cy`
dónde se planta. El tiempo importa: cada skin enseña su Q cada 3,4 segundos.

### Volver a publicar el escaparate

Como `build-vitrina.js` necesita el artifact original —que ya no está—, lo
práctico es **parchear `vitrina.html`**: sacar el bloque de la pieza de
`v-skins.js` (van entre marcas `/* ---------------- NOMBRE ---------------- */`)
y sustituir el mismo bloque dentro de `vitrina.html`. Después se publica ese
`vitrina.html` sobre la URL de arriba.

## Dónde se quedó

Tras varias vueltas de correcciones sobre capturas, lo último fue el **TORO**:
la anilla pasó a colgar del tabique por un enganche corto, en el frente del
morro (antes parecía que la llevaba en la boca), y los cuernos se cambiaron de
sitio — el principal más atrás y el del otro lado por delante, cruzándolo.

**Pendiente, y es lo primero de la próxima sesión:** Braighton todavía no ha
dicho qué entra. Hasta que lo diga, nada de esto se toca en `js/skins.js`,
`js/sprites.js`, `js/config.js` ni en la tienda.
