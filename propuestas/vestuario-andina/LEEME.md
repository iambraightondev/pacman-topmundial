# LIGA ANDINA — propuesta (19 sep 2026)

Las **26 piezas** de la cuarta tanda. Sigue el grupo que ya empezaron el **CUY**,
la **LLAMA** y el **CÓNDOR**: bichos y cosas de por aquí. **Entraron al juego el 30 sep**
(ver «En el juego», abajo).

Escaparate publicado: <https://claude.ai/artifact/GCbCayA81zNbEcXXa3AnyV>

## Qué hay

**8 skins · 1.500**

| skin | qué es | de dónde sale |
| --- | --- | --- |
| GALLITO DE LAS ROCAS | el ave nacional, con su cresta de disco | tienda |
| PUMA DE PIEDRA | cara de felino tallada, a lo Chavín | tienda |
| PAPA | con sus bultos y sus brotes | tienda |
| AJÍ | rocoto encendido que echa humo | tienda |
| SAPO | el de bronce del juego de la cantina | tienda |
| TUMI | el cuchillo de oro con el Naylamp | cofre |
| INTI | el sol con cara y sus rayos girando | cofre |
| COLIBRÍ DE NAZCA | el geoglifo, no el pájaro | cofre |

**7 accesorios · 450** — MONTERA, PONCHO, QUENA, OREJERAS DE ORO y TRENZAS en
la tienda; MÁSCARA DE ORO y PLUMAS DE GUACAMAYO de cofre.

**6 efectos · 250** — HOJAS DE COCA, NIEVE, SERPENTINA y TEJIDO en la tienda;
POLVO DE ORO y LÍNEAS DE NAZCA de cofre.

**5 emotes · 150** — ACHACHAU, HUAYNO, CHÉVERE, CHAU y QUÉ RICO.

## Los archivos

Mismo reparto que las otras tandas: `a-skins.js` + `a-skins2.js` (las ocho y su
Q), `a-muertes.js` (las ocho muertes), `a-resto.js` (accesorios, efectos y
emotes), `a-cat.js` (el catálogo con los textos), `build.js` (monta
`vitrina.html`) y `render2.html` (una pieza en grande).

```sh
node build.js        # deja vitrina.html listo para publicar
```

`build.js` se apoya en `../vestuario-2026-09-18/vitrina.html` para la página,
las primitivas, el motor de las muertes y la vitrina.

## En el juego (30 sep)

Entraron las 26 con el mismo dibujo, en el bloque TANDA ANDINA de js/skins.js
y en js/config.js. Lo que cambió al meterlas:

- La Q sale con la tecla (`qDe`), no cada 3,4 s.
- La NIEVE se llama GRANIZO (`efx_granizo`): el juego ya tenía su NIEVE.
- El COLIBRÍ DE NAZCA conserva la silueta de Pac-Man: no es extravagante (con
  la Q lleva los dientes). El INTI también la conserva, pero va como
  extravagante para que las gafas caigan en su cara, que mira de frente.
- Las TRENZAS cuelgan de la coronilla en las extravagantes: desde el ojo les
  cruzaban la cara.
- Arreglado del escaparate: las PLUMAS DE GUACAMAYO caían sobre la cara (ahora
  se abren hacia arriba y atrás), la muerte del PUMA solo pintaba una columna
  de sus cuatro bloques y el viento de NAZCA lo iba descubriendo en vez de
  borrarlo.
- Servidor: las piezas de cofre en `piezas_especiales`, los precios de las de
  tienda y los botes de la función `cofres`, ya en producción. Vuelta atrás:
  `supabase/objetos-andina-vuelta-atras.sql`.

`en-el-juego.html` las dibuja con el código DEL JUEGO (servido con
`node tests/servidor.cjs 8437` desde la raíz; las opciones van en su cabecera).
