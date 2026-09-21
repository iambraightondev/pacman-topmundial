# Plan · Catálogo de habilidades por rol

**El catálogo ya está implementado.** Este documento conserva las decisiones
de diseño y sirve como referencia de las habilidades disponibles por ranura.
Los cuatro kits fijos siguen existiendo como valores por defecto, y ahora el
armamento se selecciona antes de la partida.

Última puesta al día: **21 de septiembre de 2026**.

---

## La idea

Hoy cada rol tiene un kit fijo de cuatro poderes. La implementación permite
que **cada ranura (Q, W, E, R) tenga alternativas a elegir**, y que uno se
arme antes de la partida: el mismo rol, jugado de varias maneras. Se
conservaron todas las alternativas aprobadas, aunque algunas ranuras ofrecen
más de dos.

Con cuatro roles y cuatro ranuras salen **32 habilidades**, de las que 16 ya
existen. Las otras 16 son las que se están eligiendo aquí.

## Lo que hay hoy (no se toca salvo que se diga)

| Rol | Q | W | E | R |
| --- | --- | --- | --- | --- |
| **ASESINO** | MORDISCO · 16 s | TURBO · 24 s | FLASH · 32 s | GRITO · 60 s |
| **TANQUE** | PISOTÓN · 32 s | ESCUDO · 24 s | PROVOCAR · 32 s | APISONADORA · 46 s |
| **SOPORTE** | DISPARO HELADO · 16 s | INMUNIDAD · 24 s | ESCUDO ALIADO · 32 s | VIDA EXTRA · 180 s |
| **MAGO** | BOLA DE FUEGO · 20 s | PORTAL · 46 s | RUNA · 32 s | TORMENTA · 46 s |

---

## SOPORTE

### Catálogo implementado

| Ranura | Nombre | Qué hace | Recarga |
| --- | --- | --- | --- |
| Q | **MINA** | Trampa en el suelo 5 s: el fantasma que la pisa muere y deja escudo al jugador | 20 s |
| Q | **GANCHO** | Línea recta de 6 casillas; el fantasma atrapado se pone azul 5 s. Si falla, se gasta igual | 18 s |
| Q | **TELARAÑA** | Mancha 3×3 durante 6 s: el fantasma que la pisa va a media velocidad (el rey también) | 30 s |
| W | **ESTELA** | Velocidad ×1,25 para él y un rastro que da ×1,2 al equipo, 8 s | 24 s |
| W | **PUENTE** | Durante 8 s el equipo atraviesa paredes; los fantasmas no | 32 s |
| W | **CADENA** | Enlace de 6 s con un compañero: lo que come uno puntúa a los dos, y el primer golpe que reciba él lo aguanta el Soporte | 28 s |
| E | **MURO** | Pared justo detrás 5 s: los fantasmas se dan la vuelta (el rey también); el equipo la atraviesa | 32 s |
| E | **RELEVO** | Teletransporta al compañero más cercano, si está a 6 casillas o menos, hasta tu posición | 26 s |
| E | **FARO** | Baliza 6 s: al compañero que la toque le baja a la mitad la recarga de su R | 30 s |
| E | **SIRENA** | Lo contrario de PROVOCAR: atrae a los fantasmas a un punto señalado, no a ti | 34 s |
| R | **RESURRECCIÓN** | Levanta un cadáver que ya caducó, sin pagar las 1.000 monedas. Se pulsa y hay 5 s para pasar por encima | 180 s |
| R | **CAMPO** | Durante 5 s nadie del equipo puede morir | 150 s |
| R | **HOSPITAL** | Durante 10 s, el compañero que caiga vuelve en el acto y en el sitio, una vez | 150 s |

---

## ASESINO

### Catálogo implementado

| Ranura | Nombre | Qué hace | Recarga |
| --- | --- | --- | --- |
| Q | **SHURIKEN** | Tres en línea recta. Si aciertan los tres, se recargan al instante; si falla uno, recarga entera. Cada muerte vale 200, sin racha | 20 s |
| Q | **BOMBA** | Se deja y explota al volver a pulsar Q: 2 casillas a la redonda, 150 por fantasma, sin racha | 24 s |
| R | **MISIL** | Teledirigido a ×2,5 que mata a todos los fantasmas del más cercano al más lejano, con la racha de la pasiva (250 · 500 · 1.000 · 2.000) | 80 s |

### Alternativas implementadas por ranura

| Ranura | Nombre | Qué hace | Recarga |
| --- | --- | --- | --- |
| W | **SOMBRA** | 4 s invisible: ningún fantasma le persigue y el primer mordisco al salir vale doble | 26 s |
| W | **FRENESÍ** | 6 s: cada fantasma comido le suma +0,15 de velocidad, acumulable hasta ×1,6. Corre, pero solo si mata | 26 s |
| W | **CARROÑA** | 6 s: cada fantasma comido deja una joya que vale 300 si la recoge él antes de 3 s | 24 s |
| E | **MARCA** | Señala un fantasma 8 s: comérselo vale ×2 y se le ve la ruta | 30 s |
| E | **GANCHO INVERSO** | Se lanza hacia el fantasma más cercano a 5 casillas y lo vuelve azul para poder comérselo | 32 s |

**Ojo con el cupo**: la W tiene **tres** candidatas vivas (SOMBRA, FRENESÍ y
CARROÑA) para **dos** huecos. O cae una, o esa ranura pasa a ofrecer tres y
entonces el catálogo entero crece. Sin decidir.

**Falta cubrir**: cerrar la R del Asesino (MISIL más lo que salga de
*En análisis*).

---

## MAGO

### Catálogo implementado

| Ranura | Nombre | Qué hace | Recarga |
| --- | --- | --- | --- |
| W | **CLON** | Un doble anda en línea recta hasta topar pared. Todos los fantasmas olvidan lo suyo y van a por él; dura 6 s y explota si lo tocan | 30 s |

### Alternativas implementadas por ranura

| Ranura | Nombre | Qué hace | Recarga |
| --- | --- | --- | --- |
| Q | **BOLA GUIADA** | Como la de fuego, pero dobla en los cruces hacia el fantasma más cercano. No falla, pero solo da 150 puntos | 22 s |
| Q | **TOQUE ARCANO** | Al fantasma a 3 casillas lo pone azul 4 s en vez de matarlo: los puntos son de quien se lo coma | 18 s |
| Q | **CHISPA** | Rayo corto que salta del primero al siguiente más cercano: no mata, los aturde 2 s | 20 s |
| W | **TÓTEM** | Planta una torre 8 s que dispara una bola cada 2 s al fantasma más cercano | 34 s |
| E | **GRAVEDAD** | Atrae 3 casillas a los fantasmas cercanos y los deja quietos 1 s: los junta para la R | 32 s |
| E | **NIEBLA** | Zona de 5 s: el fantasma que entra pierde el rastro y anda al azar | 30 s |
| R | **METEORO** | **Apuntado pendiente de confirmar:** señala una casilla en la dirección de la última flecha, hasta 6 casillas o hasta la primera pared. Tras 1,5 s cae allí: mata en 2 casillas a la redonda y deja fuego 4 s | 60 s |
| R | **ECLIPSE** | Propuesta pendiente de mejora: todos los fantasmas quedan ciegos y a media velocidad durante más tiempo que los 6 s originales | 60 s |

---

## TANQUE

No tenía ninguna apuntada. Su identidad: atrae, aguanta y empuja.

| Ranura | Nombre | Qué hace | Recarga |
| --- | --- | --- | --- |
| Q | **EMPUJÓN** | Empuja 3 casillas al fantasma que tenga delante y lo aturde 1 s | 18 s |
| Q | **GRITO DE GUERRA** | Los fantasmas a 5 casillas se quedan clavados 1,5 s (no huyen: se paran) | 24 s |
| W | **YUNQUE** | Mientras esté quieto (hasta 2 s) es intocable y el que le roce sale rebotado | 20 s |
| Q | **REBOTE** | 5 s: el primer fantasma que le toque muere en vez de matarle (y se le gasta) | 30 s |
| W | **PIEL DE PIEDRA** | 5 s inmune a todo, pero a media velocidad | 28 s |
| R | **TERREMOTO** | Todos los fantasmas del mapa vuelven a casa, dan 100 puntos cada uno y tardan 6 s en salir. El equipo queda ralentizado un 20 %, incluido el Tanque | 70 s |
| R | **FORTALEZA** | 6 s en los que él y quien esté a 5 casillas no pueden morir | 90 s |

**ESTACA queda fuera**: copia la función de atraer que ya aporta CLON del
Mago. **BASTIÓN queda descartada.** FORTALEZA sigue siendo parecida a CAMPO,
pero ahora protege un radio de 5 casillas y no todo el equipo.

---

## Decisiones finales implementadas

- **EJECUCIÓN** (Asesino, R · 80 s): mata en el acto a un solo fantasma,
  aunque no esté azul, y concede **5.000 puntos únicamente por esa muerte**.
  La recarga queda en 1 min 20 s.
- **CACERÍA como R del Asesino** (cambio de lo que hay, no habilidad nueva):
  reemplaza a GRITO. Los fantasmas quedan envueltos en círculos del color del
  rol Asesino y solo pueden morir por él.
  - *A favor*: el rol se llama Asesino y puntúa; hoy su R regala la mejor
    ventana de puntos al equipo entero.
  - *En contra*: hay que resolver cómo se pintan esos fantasmas para los
    demás (ahora azul = comestible para todos; con esto, azul para uno y
    mortal para el resto, y eso se presta a muertes injustas). Y en party
    baja bastante lo que aporta el Asesino al grupo.

## Descartadas, con su motivo

| Habilidad | Rol · ranura | Por qué |
| --- | --- | --- |
| **AZUL DE EMERGENCIA** | Soporte · R | Es la R que ya tiene el Asesino (GRITO) con otro nombre |
| **DASH DE SANGRE** | Asesino · W | Otra forma de correr y embestir: se pisa con TURBO y con la APISONADORA del Tanque |
| **RELOJ** | Asesino · W | Ralentizar el mapa es control, y el control es del Soporte |
| **ESTOCADA** | Asesino · E | Es el MORDISCO con más alcance: no cambia cómo se juega |
| **CACERÍA como habilidad nueva** | Asesino · R | Competía con su propia R. Se reconvierte en un cambio de la R actual (ver *En análisis*) |
| **SED** (comer recarga la Q) | Asesino · W | No se ve desde fuera: por dentro es «la Q recarga antes», que es un número, no una jugada |
| **CEBO** (señuelo que atrae fantasmas) | Asesino · E | Choca con el CLON del Mago, que hace lo mismo |
| **INTERCAMBIO** | Mago · W | Cambiar posiciones no aporta apoyo real y puede sentirse como un sacrificio |
| **DESTIERRO** | Mago · R | Descartada |
| **ANCLA** | Tanque · E | Descartada |
| **ESTACA** | Tanque · E | Duplica la función de atraer fantasmas de CLON |
| **BASTIÓN** | Tanque · R | Descartada |

---

## Reglas que han ido saliendo

1. **Una mecánica, un rol.** Si dos roles hacen lo mismo con otro nombre, uno
   de los dos sobra: el gancho es del Soporte o del Asesino, no de los dos.
2. **Una habilidad nueva no es solo una idea**: es dibujo, aviso de red
   (anfitrión e invitado deciden cosas distintas), su hueco en la foto de
   red, la pantalla de selección y sus pruebas. Por eso el catálogo se cierra
   entero antes de construir nada.
3. **Lo que puntúa, al Asesino.** Las muertes de otros roles valen fijo
   (`MAGO_PUNTOS`) para no dejarlo sin sentido; lo mismo tendrá que valer
   para lo que entre aquí.

## Estado de implementación (21 sep)

| Rol | Q | W | E | R |
| --- | --- | --- | --- | --- |
| ASESINO | SHURIKEN · BOMBA · MORDISCO | SOMBRA · FRENESÍ · CARROÑA · TURBO | MARCA · GANCHO INVERSO · FLASH | MISIL · EJECUCIÓN · CACERÍA · GRITO |
| SOPORTE | MINA · GANCHO · TELARAÑA (3 para 2) | ESTELA · PUENTE · CADENA (3 para 2) | MURO · RELEVO · FARO · SIRENA | RESURRECCIÓN · CAMPO · HOSPITAL |
| MAGO | BOLA GUIADA · TOQUE ARCANO · CHISPA · BOLA DE FUEGO | CLON · TÓTEM · PORTAL | GRAVEDAD · NIEBLA · RUNA | METEORO · ECLIPSE · TORMENTA |
| TANQUE | EMPUJÓN · GRITO DE GUERRA · REBOTE · PISOTÓN | YUNQUE · PIEL DE PIEDRA · ESCUDO | PROVOCAR | TERREMOTO · FORTALEZA · APISONADORA |

El catálogo está cerrado e implementado. METEORO usa la última flecha: busca
hasta seis casillas abiertas, avisa durante 1,5 s, explota en radio 2 y deja
fuego durante 4 s. ECLIPSE dura 10 s y deja a todos los fantasmas ciegos y a
media velocidad.

## Cómo se elige el armamento

El armamento se elige en la pantalla de preparación de DESATADO, junto al
rol. La selección se guarda en los ajustes locales y viaja en la party, la
foto de red y la especificación de partida para que todos vean el mismo
catálogo.
