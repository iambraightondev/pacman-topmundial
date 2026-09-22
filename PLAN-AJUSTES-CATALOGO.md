# Plan · Ajustes del catálogo tras probarlo

**Nada de esto está construido.** Es la lista de Braighton del 21 de
septiembre de 2026, después de jugar el catálogo recién implementado
(`PLAN-CATALOGO.md`), contrastada una por una con lo que hace el juego hoy.

Cada punto dice **qué pasa ahora** (comprobado en el código, no de memoria),
**qué se pide** y **qué hay que tocar**. Los que piden criterio llevan
propuesta con recomendación; están agrupados al final en *Lo que hay que
decidir antes*.

---

## Lo que son errores, no gustos  ·  HECHO (21 sep, noche)

Van primero porque son cosas rotas: se arreglan aunque el resto del catálogo
siga en discusión. **Los cinco están construidos y probados** —cada uno con
su prueba de Node y la de navegador—; lo que queda por hacer empieza en *Los
números*.

### 1 · FORTALEZA no se apaga nunca *(punto 4)* — HECHO

**Hoy:** la habilidad enciende su reloj de 6 s, pero ese reloj **no baja
nunca**. El Tanque y todo el que esté a cinco casillas quedan inmortales
hasta que él muera o acabe el nivel; la tecla se ve encendida todo el
recargue. Es el único poder del catálogo al que se le olvidó el descuento
por fotograma.

**Se pide:** que dure sus 6 s y se apague.

**Qué implica:** bajar el reloj con el resto de relojes del jugador y apagar
el aura al llegar a cero. Un arreglo pequeño. Conviene repasar de paso si
algún otro poder del catálogo tiene el mismo olvido.

### 2 · Un fantasma aturdido sigue matando *(puntos 1 y 10)* — HECHO

**Hoy:** aturdir a un fantasma solo le pone la velocidad a cero. Se queda
clavado, pero **sigue siendo mortal**: el que pase por encima muere igual.
Afecta a EMPUJÓN, CHISPA, GRAVEDAD y al enganchón del GANCHO INVERSO.

**Se pide:** que quien pase por un fantasma aturdido no muera.

**Qué implica:** convertir el aturdimiento en un estado **inerte**: ni mata
ni se puede comer (salvo que además esté azul por otra cosa). Hay que
tocarlo en el choque entre Pac-Man y fantasma, que es el sitio más delicado
del juego: afecta a todos los roles, a la party y a las repeticiones
viejas. Y necesita señal visual propia, porque un fantasma quieto que no
mata tiene que distinguirse de uno quieto que sí.

**Ojo:** esto cambia el valor de tres habilidades a la vez. Un aturdimiento
deja de ser «lo paro» y pasa a ser «lo apago»: es bastante más fuerte.

### 3 · PUENTE es intangibilidad, y encima para todos *(punto 16)* — HECHO

**Hoy:** mientras dura, **cualquier** Pac-Man atraviesa **cualquier** pared
del laberinto. Dos fallos en uno: no es un puente, es volverse fantasma; y
la comprobación ni siquiera mira de quién es el poder, así que se lo come
todo el mundo, esté donde esté.

**Se pide:** que abra un hueco en un muro, nada más.

**Cómo quedó:** una zona del mapa, no un estado del jugador. Al pulsar
perfora el muro que el Soporte tiene delante y abre el paso hasta el pasillo
del otro lado, hasta cuatro casillas de grosor —lo que miden los bloques del
laberinto—; si delante hay pasillo, si el muro es más grueso o si al otro
lado está la casa, no sale y no se gasta. Lo cruza el equipo y no los
fantasmas, y al cerrarse el que se quedara dentro sale por la boca más
cercana.

*(Una sola casilla no servía: casi todos los muros del laberinto son de dos
o tres, así que un hueco de una no llevaba a ninguna parte.)*

### 4 · GANCHO no engancha *(punto 15)* — HECHO

**Hoy:** no hay gancho. Se pinta una línea, y al fantasma que hubiera en
esa línea se le pone azul cinco segundos. No sale nada, no viaja nada y no
se arrastra a nadie.

**Se pide:** que se vea el gancho y que **atraiga** al fantasma, tomando
como guía el GANCHO INVERSO del Asesino, que sí está hecho así.

**Qué implica:** reaprovechar el proyectil del Asesino con las fases de ida
y vuelta, pero al revés: allí el gancho arrastra al jugador hacia el
fantasma, y aquí tiene que traer al fantasma hacia el Soporte, dejándolo
azul al llegar. Si falla, vuelve y se gasta igual (eso ya está decidido).

### 5 · GRAVEDAD no se nota *(punto 6)* — HECHO

**Hoy:** sí hace algo, pero es invisible y muy fácil de fallar. A los
fantasmas que estén a tres casillas los **teletransporta** de golpe hacia
ti y los aturde **un segundo**. Como el salto es instantáneo y el aturdido
no se ve, parece que no ha pasado nada. Además no toca a los fantasmas
azules ni a los que vuelven hechos ojos, así que muchas veces no coge a
nadie.

**Se pide:** que haga algo.

**Propuesta:** que la atracción sea un **arrastre visible** de medio
segundo (se les ve venir, no aparecen), que el aturdido suba a 2 s —con el
arreglo del punto 2, quietos y apagados— y que el radio suba de 3 a 4
casillas. Con eso pasa a ser lo que decía el catálogo: los junta para
rematarlos.

---

## Los números (cambios de una línea)  ·  HECHO (22 sep)

| # | Habilidad | Hoy | Se pide |
| --- | --- | --- | --- |
| 10 | CHISPA · aturdido | 2 s | **3 s** |
| 11 | MURO · duración | 5 s | **10 s** |
| 17 | TELARAÑA · duración | 6 s | **16 s** |
| 2 | GRITO DE GUERRA · duración | 1,5 s | **2,5 s** |

Ninguno tiene trampa, pero el MURO a 10 s y la TELARAÑA a 16 s dejan al
Soporte con medio mapa cortado casi todo el rato: conviene mirarlos jugando
antes de darlos por buenos.

---

## Los que cambian cómo se juega

### 6 · EMPUJÓN también hacia atrás *(punto 1)* — HECHO

**Hoy:** busca fantasma en las tres casillas **de delante** (hacia donde
mira el Tanque) y lo aleja tres casillas.

**Se pide:** poder empujar hacia atrás.

**Cómo lo entiendo** (confírmemelo): que si no hay nadie delante, coja al
que viene **por detrás** y lo empuje hacia atrás, alejándolo igual. Es la
jugada de «me lo quito de encima cuando ya lo tengo pegado», que hoy no
existe: si te alcanzan por la espalda, la Q no hace nada.

### 7 · GRITO DE GUERRA pasa a ser E, y a todo el mapa *(punto 2)* — HECHO

**Hoy:** es una Q del Tanque y solo alcanza cinco casillas a la redonda.

**Se pide:** que sea **E**, que alcance **todo el mapa** y que dure 2,5 s.

**Qué implica:** esto **tapa un agujero que ya tenía el catálogo**: la E del
Tanque era la única ranura del juego con una sola opción (PROVOCAR), porque
sus dos candidatas se cayeron. Con el cambio, la Q se queda con tres
opciones y la E con dos, que es como está el resto.

**Aviso:** clavar a los cuatro fantasmas del mapa 2,5 s, y encima apagados
por el punto 2, es una R, no una E. Si entra tal cual, o sube la recarga
bastante por encima de los 24 s de hoy, o el Tanque se come al Mago: su
ECLIPSE (R de 60 s) hace algo parecido y más flojo. Mi recomendación:
dejarlo global pero subir la recarga a 40-45 s.

### 8 · ESTELA deja rastro fijo *(punto 12)* — HECHO

**Hoy:** el rastro se va borrando solo; cada pisada dura tres cuartos de
segundo y desaparece, aunque la habilidad siga activa.

**Se pide:** que el rastro **se quede** mientras dure la habilidad y se
borre entero al acabarse.

**Qué implica:** el rastro pasa a ser un camino completo de ocho segundos
en vez de una cola corta detrás del Soporte. Es bastante más fuerte —el
equipo entero corriendo por la línea que él dibujó— y se ve mucho mejor.

### 9 · TERREMOTO tiene que temblar *(punto 3)* — HECHO

**Hoy:** manda a los cuatro fantasmas a casa y el juego se congela medio
segundo (es el parón de comer, que salta cuatro veces seguidas). Por fuera
parece que el juego se ha colgado un momento, no que haya pasado un
terremoto.

**Se pide:** que tiemble el mapa.

**Qué implica:** no hay ningún temblor de pantalla en el juego, así que es
algo nuevo: mover el dibujo del laberinto unos píxeles durante los seis
segundos del poder, fuerte al principio y calmándose. Conviene que sea un
apaño reutilizable, porque al METEORO le vendría igual de bien. Y hay que
dejarlo quieto si el jugador tiene activado reducir movimiento.

### 10 · BOLA GUIADA por los pasillos *(punto 5)* — HECHO

**Hoy:** vuela en línea recta hacia el fantasma **atravesando las paredes**,
como si el laberinto no existiera.

**Se pide:** que respete los caminos, como el MISIL.

**Qué implica:** el MISIL ya calcula ruta por el laberinto y la sigue: la
bola puede usar lo mismo. Ojo con una cosa: la bola tiene que seguir sin
fallar (es su gracia y por eso da solo 150 puntos), así que si el fantasma
se mueve, la ruta se recalcula igual que hace el misil.

---

## Los que necesitan dibujo  ·  HECHO (22 sep)

Hoy MINA, MURO, FARO, SIRENA, TELARAÑA, NIEBLA y TÓTEM se pintan **todos
con el mismo molde**: un cuadrado de color translúcido con borde. Solo el
CLON, el METEORO y las joyas de CARROÑA tienen dibujo propio. Por eso se
ven básicos: no es que estén mal dibujados, es que no están dibujados.

| # | Habilidad | Qué debería verse |
| --- | --- | --- |
| 14 | **MINA** | Un artefacto en el suelo, con su parpadeo antes de saltar |
| 14 | **MURO** | Una pared de verdad en la casilla, no una sombra de color |
| 13 | **SIRENA** | Un foco que llama, con ondas que salen hacia fuera |
| 18 | **FARO** | Una baliza girando, que se apague al gastarse |

Todas se dibujan en el mismo sitio del código, así que van juntas en una
sola pasada. Y hay que respetar lo de siempre: se pintan en el suelo, para
que fantasmas y Pac-Man pasen por encima sin tapar la señal.

---

## Lo que había que decidir  ·  DECIDIDO Y HECHO (22 sep)

Estos tres no son un arreglo: son «esto no funciona, cámbialo». Van con
propuesta, pero la decisión es suya.

### TOQUE ARCANO es el MORDISCO otra vez *(punto 8)* — HECHO: opción A

**Hoy:** coge al fantasma más cercano a tres casillas y lo pone azul cuatro
segundos. El MORDISCO del Asesino coge al más cercano y se lo come. La
diferencia —que los puntos son de quien se lo coma— **no se ve al jugarlo**.

| Opción | Qué sería | A favor / en contra |
| --- | --- | --- |
| **A · El azul se contagia** (recomendada) | El fantasma tocado pone azul a cualquier otro con el que se cruce, mientras dure | Es del Mago de arriba abajo, no se parece a nada, y en party es una bola de nieve que el equipo aprovecha |
| B · Toque a distancia | Sube el alcance a 6 casillas y baja el azul a 3 s | Barato, pero sigue siendo el mordisco con más brazo |
| C · Se cae | La Q del Mago se queda con BOLA DE FUEGO, BOLA GUIADA y CHISPA | Tres opciones ya son suficientes |

### NIEBLA no tiene gracia *(punto 9)* — HECHO: ni A ni B, se hizo DOMINIO

**Hoy:** una zona de cinco segundos; el fantasma que entra camina al azar.
El problema es que un fantasma que anda al azar **se parece mucho a uno que
te persigue mal**: no se distingue, no se planea nada con ello y el Mago ya
tiene la CEGUERA global en su R.

| Opción | Qué sería | A favor / en contra |
| --- | --- | --- |
| **A · ESPEJISMO** (recomendada) | La zona no confunde: **devuelve** por donde vino al fantasma que entra, como un MURO redondo de 5 s | Se ve al instante lo que hace, es del Mago y no lo tiene nadie |
| B · Niebla que tapa | La zona esconde a quien esté dentro: los fantasmas dejan de verlo | Choca con la SOMBRA del Asesino |
| C · Se cae | La E del Mago se queda con RUNA y GRAVEDAD | Dos opciones es lo normal en el resto de ranuras |

### METEORO es imposible de apuntar *(punto 7)* — HECHO: opción A

**Hoy:** cae hasta seis casillas por delante, en la dirección de la última
flecha que pulsaste, parando en la primera pared. Para ponerlo donde
quieres tienes que colocarte tú, mirando hacia allí, con el laberinto de
por medio.

| Opción | Qué sería | A favor / en contra |
| --- | --- | --- |
| **A · Se apunta mientras se mantiene** (recomendada) | Mantienes la R y la marca se va moviendo por los pasillos con las flechas; sueltas y cae | El juego ya sabe mantener teclas (el hielo y el escudo del Soporte van así). Apuntar de verdad, sin ratón |
| B · Cae sobre el montón | Sin apuntado: cae donde haya más fantasmas juntos | Es un botón, pero nunca falla y premia esperar |
| C · Se reemplaza | Fuera, y la R del Mago se queda con TORMENTA y ECLIPSE | El Mago ya tiene dos erres buenas |

---

## Punto 19

Quedó vacío en la lista. Cuando me lo diga, lo sumo aquí.

---

## Lo que queda

**Nada de esta lista**, salvo el punto 19, que sigue vacío. El 22 por la
tarde entró lo que faltaba: TOQUE ARCANO contagioso, METEORO apuntado y, en
lugar del ESPEJISMO que se propuso aquí (era el MURO del Soporte en redondo,
como se vio al leerlo), **DOMINIO**: el Mago se queda un fantasma 6 s y lo
manda a cazar a los suyos.

En la misma tanda se cerró un agujero que no estaba en la lista: el REY
FANTASMA no recibía NINGUNA habilidad del catálogo.

---

### (referencia) Lo que quedaba antes

Solo **los tres que esperan decisión** (TOQUE ARCANO, NIEBLA y METEORO) y el
punto 19, que sigue vacío. Todo lo demás de esta lista está construido y
probado: los errores el 21 de septiembre, y los números, los que cambian cómo
se juega y los cuatro dibujos el 22.

Decisiones tomadas por el camino, por si hay que revisarlas jugando: el GRITO
DE GUERRA global pasó a 40 s de recarga; el PUENTE perfora hasta cuatro
casillas de muro; el temblor del TERREMOTO dura 1,5 s de los seis del poder.

---

## Por dónde empezaría

1. ~~**Lo roto** (FORTALEZA, PUENTE, GANCHO, aturdimiento, GRAVEDAD)~~ —
   **hecho el 21 de septiembre por la noche.** Con el aturdimiento apagado,
   EMPUJÓN, GRITO DE GUERRA, CHISPA y GRAVEDAD valen más que cuando se
   escribió esta lista: conviene volver a jugarlas antes de tocar sus números.
2. **Los números** (CHISPA, MURO, TELARAÑA, GRITO DE GUERRA) y el cambio de
   ranura del Tanque, que de paso tapa el agujero de su E.
3. **Los que cambian el juego** (EMPUJÓN atrás, ESTELA fija, BOLA GUIADA por
   los pasillos, TERREMOTO con temblor).
4. **Los dibujos**, los cuatro de una vez.
5. **Lo que decida** de TOQUE ARCANO, NIEBLA y METEORO.

Cada punto lleva su prueba, como el resto del catálogo: las de Node para lo
que son reglas y las de navegador para lo que se ve.
