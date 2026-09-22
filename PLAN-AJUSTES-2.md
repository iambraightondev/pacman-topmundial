# Plan · Segunda ronda de ajustes (tras jugar el catálogo terminado)

**TODO ESTO YA ESTÁ CONSTRUIDO** (madrugada del 22 de septiembre de 2026).
El documento se queda como estaba —es el razonamiento con el que se
decidió—, con esta nota al principio de lo que se resolvió:

- **Los puntos 1 y 2 eran el MISMO fallo.** El punto 1 se apuntó al revés:
  no era el Asesino el que quedaba «en modo fantasma», era **el fantasma**
  el que, al salir de casa con el Asesino esperando en la puerta, moría de
  un toque sin estar azul. La causa es `Hab.puedeComer`, que miraba
  `G.frightTicks` —el reloj de la mesa— en vez del azul del propio fantasma.
  Al comerse uno se le quita ese azul, pero el reloj seguía corriendo, así
  que al volver de casa era comida gratis. Arreglado y con prueba.
- **De propina, el GANCHO INVERSO:** buscando lo anterior salió que la
  cuerda no moría con su dueño. En solitario la barría la reaparición; en
  línea, la foto del anfitrión se la devolvía al invitado ya resucitado y lo
  arrastraba solo. Cortada también.
- **Punto 3 (botín):** **opción A**.
- **Los números:** hechos.
- **Punto 4 (marca):** entran las **tres** (shuriken, bomba y bola guiada).
  EJECUCIÓN, TERREMOTO y DOMINIO se quedan fuera.

---

Lo de abajo es la lista de Braighton del 22 de septiembre de 2026, después
de jugar el catálogo ya cerrado, contrastada una por una con lo que hacía el
juego entonces.

Cada punto dice **qué pasa ahora** (comprobado en el código, no de memoria),
**qué se pide** y **qué implica**. Los dos primeros son fallos; el resto son
ajustes de juego.

---

## Los fallos

### 1 · El GANCHO INVERSO deja al Asesino «en modo fantasma» al reaparecer *(punto 2)*

**Hoy:** sin diagnosticar. Se empezó a investigar el 22 de septiembre por
la noche y quedó a medias: hay que reproducirlo (morir mientras el gancho
está en el aire, y morir mientras arrastra) y mirar qué estado se queda
puesto al reaparecer — el candidato es el proyectil del gancho, que sigue
vivo en la lista de proyectiles cuando su dueño muere, y el estado que marca
que el gancho sigue fuera.

**Se pide:** que al reaparecer se vuelva a la normalidad.

### 2 · Fantasmas que mueren al salir de casa sin estar azules *(punto 3)*

**Hoy:** sin diagnosticar. La sospecha con la que se estaba trabajando es
que alguna habilidad deja un estado sobre un fantasma que, al volver este a
casa y salir otra vez, lo mata en el acto: el azul del catálogo, la marca de
la cacería o el dominio nuevo, que sobreviven al paso por casa. Hay que dar
con cuál y en qué condición exacta.

**Se pide:** que un fantasma que sale de casa sin estar azul no muera solo.

**Ojo:** esto regala bajas, así que puede estar falseando puntuaciones y
rachas desde que se probó.

### 3 · El botín de CARROÑA no se llega a ver *(punto 6)*

**Hoy:** la moneda nace en la casilla EXACTA donde cayó el fantasma, y desde
el 22 de septiembre la puede coger cualquiera con solo estar a menos de una
casilla. Como al Asesino lo normal es matar de cerca —mordisco, sombra,
contacto—, él ya está ahí: la moneda se recoge en el mismo fotograma en que
aparece. No es que no se vea bien: es que no llega a verse.

**Se pide:** que se vea el botín.

**Propuesta** (elija una):

| Opción | Qué sería | A favor / en contra |
| --- | --- | --- |
| **A · Sale despedida** (recomendada) | La moneda salta una o dos casillas por el pasillo, lejos del Asesino, y además nadie puede cogerla durante medio segundo | Se ve salir y se ve caer; recogerla pasa a ser una decisión (ir a por ella) y no un accidente. En party, el compañero tiene una oportunidad real de llegar |
| B · Solo medio segundo de gracia | Se queda donde cayó, pero no se puede coger hasta pasado ese rato | Una línea de código, pero si el Asesino sigue parado ahí se la lleva igual: se verá, no se disputará |
| C · Las tres del montón | Al matar varios seguidos, las monedas se reparten en las casillas libres de alrededor | Resuelve también el caso de dos bajas en el mismo sitio, pero es el más trabajo |

---

## Los números

| # | Habilidad | Hoy | Se pide |
| --- | --- | --- | --- |
| 4 | FRENESÍ · duración | 8 s | **10 s** |
| 4 | FRENESÍ · recarga | 26 s | **32 s** |
| 5 | ESCUDO ALIADO · mantener para que llegue a todo el equipo | 3 s | **2 s** |

Del ESCUDO ALIADO, para que conste: la versión «a todos» ya existe y es la E
MANTENIDA; lo único que cambia es cuánto hay que aguantar la tecla. Bajarlo a
dos segundos lo acerca al HIELO del mismo rol, que ya se mantiene dos.

---

## Lo que cambia cómo se juega

### 4 · El SHURIKEN tiene que respetar la MARCA *(punto 1)*

**Hoy:** la MARCA (E del Asesino) duplica lo que vale un fantasma marcado,
pero el SHURIKEN no se entera. Su baja paga **200 puntos exactos**, y ese
«exacto» es precisamente la vía que se salta todos los multiplicadores: la
racha, el bono del rol y también la marca. Marcar y disparar el shuriken da
hoy lo mismo que disparar sin marcar.

**Se pide:** que el shuriken cobre doble sobre un fantasma marcado (400).

**Qué implica:** dejar pasar la marca —y solo la marca— en los premios
fijos. **Ojo, hay dos habilidades más en la misma situación**: la BOMBA (150
exactos) y la BOLA GUIADA (150 exactos) tampoco cobran la marca. Si la idea
es que la marca valga siempre, entran las tres; si se quiere solo el
shuriken, hay que decirlo, porque el día que se pruebe la bomba sobre un
marcado pasará lo mismo.

---

## Por dónde empezaría

1. **Los dos fallos** (el gancho inverso y los fantasmas que mueren al
   salir): son errores, y el segundo regala bajas.
2. **El botín de CARROÑA**, en cuanto elija opción.
3. **Los números** (frenesí y escudo aliado), que son de una línea.
4. **El shuriken y la marca**, con la decisión sobre la bomba y la bola.

Cada punto llevará su prueba, como el resto del catálogo: las de Node para lo
que son reglas y las de navegador para lo que se ve.
