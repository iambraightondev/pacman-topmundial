# Vestuario YŌKAI — propuesta (29 sep 2026)

Las **28 piezas** de la cuarta tanda: folclore japonés, porque Pac-Man nació
en Japón. **Todavía NO están en el juego**: esto es el escaparate con el que
Braighton decide qué entra, qué se retoca y qué se descarta.

Escaparate publicado: <https://claude.ai/artifact/SNNQ3Qqt6fyS18P65hP9YS>

## Qué hay

**10 skins · 1.500**

| skin | su Q | su muerte | de dónde sale |
| --- | --- | --- | --- |
| TENGU | el abanicazo | se lo lleva su torbellino | tienda |
| KAPPA | chorro de agua | reverencia, se vacía el plato | tienda |
| TANUKI | se hace tetera (Bunbuku) | solo queda la hoja | tienda |
| DARUMA | le pintan el otro ojo | se endereza dos veces, a la tercera se raja | tienda |
| KASA-OBAKE | se abre y se sacude | el viento le da la vuelta | tienda |
| CHŌCHIN-OBAKE | llamarada | se apaga y se pliega | tienda |
| NAMAZU | terremoto | lo clava la kaname-ishi | tienda |
| KITSUNE | corro de fuegos fatuos | las colas se van una a una | cofre |
| ONI | el mazazo | el mamemaki: judías y huye | cofre |
| MANEKI-NEKO | lluvia de koban | se hace añicos | cofre |

El RYŪ de la idea inicial se cambió por el NAMAZU: el juego ya tiene DRAGÓN.

**7 accesorios · 450** — MÁSCARA KITSUNE, KASA DE PAJA, CHONMAGE, RAMEN y
KATANA en la tienda; KABUTO y TAMBORES DE RAIJIN de cofre.

**6 efectos · 250** — TORII, OLAS, ORIGAMI y FAROLILLOS en la tienda; ONIBI y
KOI de cofre. (Sin sakura ni humo: ya existen PÉTALOS y HUMO.)

**5 emotes · 150** — KAWAII, ¡BANZAI!, ITADAKIMASU, ZEN y NINJA.

## Los archivos

Mismo reparto que la tanda de mitología:

| archivo | qué lleva |
| --- | --- |
| `y-skins.js` | KITSUNE, TENGU, KAPPA, ONI, TANUKI y sus Q, más `llamaAzul`, `humoPuf`, `kanabo`, `hojaTanuki` |
| `y-skins2.js` | DARUMA, MANEKI-NEKO, KASA-OBAKE, CHŌCHIN-OBAKE, NAMAZU y sus Q |
| `y-muertes.js` | las diez muertes (`conMuerte`) |
| `y-resto.js` | accesorios (`ACC.id`), efectos (`EFX.id`) y emotes (`caraYokai`), ya como los quiere el juego |
| `y-puente.js` | enchufa ACC/EFX/emotes a la vitrina (no va al juego) |
| `y-cat.js` | el catálogo con los textos de cada tarjeta |
| `build.js` | monta `vitrina.html` (lo publicado) y `motor.js` |
| `render2.html` | hoja de contacto de una o varias piezas en grande y a tamaño de partida |

```sh
node build.js        # vitrina.html listo para publicar, y motor.js
```

`build.js` se apoya en `../vestuario-2026-09-18/vitrina.html` para la página,
las primitivas, el motor de las muertes y la vitrina, y le quita el esqueleto
(doctype/head/body) que trae de la descarga.

### Mirar una pieza de cerca

Con el Chromium de Playwright, sin servidor (hace falta `node build.js` antes,
por `motor.js`):

```sh
CHROME="$LOCALAPPDATA/ms-playwright/chromium-1243/chrome-win64/chrome.exe"
"$CHROME" --headless --disable-gpu --allow-file-access-from-files \
  --force-device-scale-factor=1 --window-size=1620,368 \
  --virtual-time-budget=1500 --screenshot="$PWD/oni.png" \
  "file:///$(pwd -W)/render2.html?id=oni&k=9&ts=2.0,2.0,0.3,0.7,5.8,6.3&fs=0,2,0,0,0,0"
```

`ts` son los instantes (la Q sale cada 3,4 s; la muerte entre 5,3 y 6,8), `fs`
la fase de boca de cada uno, `k` la escala, `c` el color (`%23ff0000`) e `id`
admite varias separadas por comas (una fila cada una).

## Al portar al juego

- Q: cambiar `qFase(t, 3.4, dura)` por `qDe(o, dura)`.
- `rastro` ya existe en js/skins.js: no se copia.
- Muertes que tocan la foto con banderas propias: `o.colas` y `o.sinFuego`
  (kitsune), `o.agua` (kappa), `o.sinMaza` (oni), `o.sinHoja` (tanuki),
  `o.sinCascabel` (maneki), `o.vuelta` (kasa), `o.apagado` (chōchin).
- El DARUMA pinta 福 con `fillText`: depende de que el sistema tenga una
  fuente con kanji (Windows, Mac, Android e iOS la traen).
- El emote NINJA no choca por id con la CINTA NINJA (acc_ninja), pero el
  nombre se parece: si molesta, renombrarlo a SHINOBI.

## Dónde se quedó

Dibujadas y revisadas en grande las 28, publicado el escaparate. **Pendiente:**
que Braighton diga qué entra. Hasta entonces no se toca js/ ni css/.
