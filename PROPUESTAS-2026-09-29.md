# Propuestas pendientes de decisión (29 sep 2026)

Sacadas de datos reales de producción (10 cuentas, 8 activas del 19 al 28 sep;
las partidas de menos de 1 min de IAMBRAIGHTON, que son pruebas, fuera).
Scripts de análisis: solo lectura. Nada de esto está hecho: espera a Braighton.

## 1. Reto diario de dos niveles — recomendada A + comodín
- Problema: solo 3 de 8 mantienen racha. Los retos de UNA partida (20.000
  puntos, nivel 4/6, 2 niveles sin morir) rompen rachas; los que suman en el
  día los cumple todo el que juega. El 25 sep FERCRO y PIERO sumaron 47-49 mil
  puntos y no cumplieron (pedía 20.000 en una partida).
- A: básico fijo "SUMA 20.000 PUNTOS HOY" mantiene la racha (60 monedas +
  1.000 xp); el reto de hoy pasa a ser el DURO (100 + 2.500 xp, como ahora);
  la semana completa sigue pidiendo los 7 duros. Coste: ~5 % más de monedas.
- Comodín: 1 por cada 7 días de racha, máximo 1 guardado; se gasta solo.
- Técnico: CFG.DAILY, js/daily.js (b[] y comodín), no cambiar el significado
  de dailySemana (cofre de PLATA).

## 2. Primeros pasos — recomendada A (8 misiones en 3 días)
- 3 de 5 cuentas de septiembre no volvieron un segundo día.
- Misiones: partida de más de 1 min (100), 3 fantasmas con un energizante
  (100), DESATADO usando Q/W/E/R (150), crear cuenta (cofres de bienvenida),
  reto básico del DAILY (150), ponerse algo del vestuario (100), probar
  LABERINTOS o CACERÍA (150), las 5 de colocación (300); todas → cofre de
  PLATA. Solo cuentas con menos de 20 partidas; lo ya hecho cuenta.
- El cofre de premio exige tocar el servidor de cofres.

## 3. Rango — recomendadas 3a-C y 3b-A+B
- 3a: los nuevos no pasan de CEREZA IV (8.000 y nivel 2): FERCRO 0 de 4,
  PIERO 1 de 5. C: dentro de CEREZA no se pierde, y llegar al nivel 2 da al
  menos +5. A los habituales no les cambia nada.
- 3b: en septiembre el rango pagó 10.800 monedas (hasta el 20 % de lo ganado).
  LLAVE en un mes pagaría 22.500 (media tienda). A: tabla de premios POR
  TEMPORADA (septiembre congelado: cambiar premios hoy reescribe lo cobrado y
  dejaría saldos negativos). B: desde octubre CAMPANA 3.000 y LLAVE 5.000.

## 4. Ritmo del pase — recomendada D, ANTES DEL 1 OCT
- Hoy los que juegan a diario lo acaban hacia el día 4-6; los esporádicos se
  quedan en los galones 2-4.
- D: tope de 1.800 de experiencia del pase al día → los diarios terminan
  hacia el día 25. Cabe en los topes del servidor (px <= 5 × monedas + 5.000).
- Después del 1 oct, cambiar el coste del galón reescribe el mes en curso.

## 5. Factor de rol en party — recomendada C
- En party el factor es la media del equipo: una pareja con Soporte saca un
  19 % más de marca que con Tanque, sin rendir menos.
- C: en party, media corrección (Soporte 0,8; Tanque y Mago 0,95) hasta tener
  ~20 clasificatorias de party marcadas (se apuntan desde el 28 sep).
- Técnico: factorRoles(roles, n) en js/rango.js, con n > 1: 1 − (1 − f)/2.
