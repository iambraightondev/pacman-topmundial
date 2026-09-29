# Aperturas de cofre — propuesta (28 sep 2026)

Lo que pedía `PLAN-COFRES.md` §4: 2–3 aspectos de la pantalla de apertura antes
de fijar uno. Hay cuatro, cada uno con las mismas seis escenas en bucle (MADERA
con monedas, PLATA con efecto, ORO con accesorio + skin, ORO repetido que pasa a
monedas, LEGENDARIO y el ORO del 2 % que resulta LEGENDARIO).

Escaparate publicado: <https://claude.ai/artifact/BrZRgHuGi9ue9u2v54RUDN>

| | nombre | en una línea |
| --- | --- | --- |
| A | LA DE HOY, PULIDA | la escena actual con luz por la rendija, onda, rebote y monedas que se cuentan |
| B | EL SALTO | tres saltos, la tapa sale girando y el premio sube por un haz como una carta |
| C | LA TRAGAPERRAS | el cofre es la máquina; el rodillo gira mientras contesta el servidor y frena en el premio |
| D | LA CASA DE LOS FANTASMAS | Pac-Man se come la superpastilla y luego el cofre asustado; el premio sale por la puerta |

## Los archivos

- `aperturas.html` — la página entera (sin `<!doctype>`: el Artifact la envuelve).
  Lleva dentro la letra del juego y carga `js/config.js`, `js/letra.js`,
  `js/sprites.js` y `js/skins.js` **del juego**, así que los premios son los
  dibujos de verdad (`Skins.escena` + `Skins.lupa`, como `UI.pintarPremioCofre`).
- `servir.js` — `node servir.js` y abrir <http://localhost:8765/>.

Para republicar: la página y, como archivos de apoyo, los cuatro js del juego en
`js/…`.

## Para cuando se elija

El cofre de píxel es el de `UI.pintarCofre`, partido en cuerpo y tapa para
poder moverla (`cofre()` en la página). Los textos de debajo son los de
`UI.textoPremioCofre`. Cada alternativa es un objeto con `abre`, `revela`,
`dur` y `draw(ctx, escena, t, reloj)`; lo que hay que llevar a
`UI.animarAperturaCofre` es ese `draw`, con la espera enganchada a la respuesta
del servidor en vez de a un tiempo fijo.
