# Vestuario de MITOLOGÍA — propuesta (19 sep 2026)

Las **28 piezas** de la tercera tanda. Braighton eligió: mitología, tanda
completa, tres de cada ocho solo de cofre y un par de temporada para Halloween.
**Todavía NO están en el juego.**

Escaparate publicado: <https://claude.ai/artifact/LqebZaoKvGLj5v4ymUxzMr>

## Qué hay

**10 skins · 1.500**

| skin | su Q | de dónde sale |
| --- | --- | --- |
| MEDUSA | la mirada que petrifica | tienda |
| CÍCLOPE | el pisotón | tienda |
| GOLEM | se endurece, la runa arde | tienda |
| ESFINGE | el acertijo | tienda |
| ÍCARO | se eleva | tienda |
| FÉNIX | arde entero | cofre |
| GENIO | concede el deseo | cofre |
| TRITÓN | sopla la caracola | cofre |
| LA PARCA | el guadañazo | **Halloween** |
| JINETE SIN CABEZA | lanza la calabaza | **Halloween** |

**7 accesorios · 450** — CUERNOS DE CARNERO, BARBA DE ZEUS, SERPIENTE, VENDA
DEL ORÁCULO y MÁSCARA DE TEATRO en la tienda; CASCO ALADO y OJO QUE TODO LO VE
de cofre.

**6 efectos · 250** — RAYOS, ARENA, RUNAS y PISADAS DE PIEDRA en la tienda;
BRASAS y NIEBLA de cofre.

**5 emotes · 150** — ORÁCULO, PETRIFICADO, DIVINO, MALDICIÓN e INVOCANDO.

## Los archivos

Mismo reparto que la tanda de objetos: `m-skins.js` + `m-skins2.js` (las diez
y su Q), `m-muertes.js` (las diez muertes), `m-resto.js` (accesorios, efectos
y emotes), `m-cat.js` (el catálogo con los textos de cada tarjeta), `build.js`
(monta `vitrina.html`) y `render2.html` (una pieza en grande).

Accesorios y efectos van escritos ya como los quiere el juego
(`ACC.id = function (ctx, o)` y `EFX.id = function (ctx, o, cuerpo)`).

```sh
node build.js        # deja vitrina.html listo para publicar
```

`build.js` se apoya en `../vestuario-2026-09-18/vitrina.html` para la página,
las primitivas, el motor de las muertes y la vitrina.

## Detalle que conviene no perder

**LA PARCA** y el **JINETE SIN CABEZA** llevan `temporada: true` en el
catálogo: cuando entren al juego van con `pide: { fecha: 'halloween' }`, como
CALABAZA y NOCHE DE BRUJAS, y solo salen del 24 al 31 de octubre
(`CFG.SKIN_FECHAS`).

## Dónde se quedó

Dibujadas las 28 y publicado el escaparate. **Falta que las vea y diga cuáles
entran.**
