  /* ---------- Las cinco piezas del pase de diciembre ---------- */
  var CAT = [
    { id: 'anoviejo', name: 'AÑO VIEJO', cat: 'skin', carril: 'pago', galon: 30,
      ve: 'El muñeco que se quema a medianoche: cabeza de trapo relleno de paja, cosida a parches (uno del color del jugador), ojo de botón cosido en cruz, sombrero de paja roto y el cartel del 2026 prendido con un alfiler. La mandíbula de trapo, con los labios cosidos, es la boca.',
      q: 'Le prenden la mecha que asoma por el sombrero: se consume chisporroteando y revientan los petardos que lleva dentro, uno detrás de otro, mientras el muñeco da respingos.',
      muerte: 'Lo que toca a medianoche: arde de abajo arriba, se queda en ceniza negra, se hunde y el viento se lleva las pavesas.',
      ojo: 'Quemar el año viejo es de aquí (Perú, Ecuador, Colombia...), y es lo contrario de la Navidad: CLAUS-MAN ya se regala del 20 de diciembre al 6 de enero, así que el pase no le pisa nada.' },

    { id: 'acc_lentes', name: 'LENTES 2027', cat: 'accesorio', carril: 'pago', galon: 10,
      ve: 'Los lentes de fiesta del año nuevo: el 2027 en cifras doradas con purpurina, y el CERO hace de cristal ahumado del color del jugador, justo sobre el ojo. Los destellos saltan de cifra en cifra.',
      ojo: 'Van a la cara, como las gafas de la tienda.' },

    { id: 'acc_maleta', name: 'MALETA', cat: 'accesorio', carril: 'gratis', galon: 30,
      ve: 'La maleta de dar la vuelta a la manzana a medianoche, para viajar el año que viene: de cuero, con sus correas, esquinas de metal, pegatinas de los viajes (un sol, un corazón, una estrella) y una etiqueta del color del jugador. Va colgada a la espalda y bota al correr.',
      ojo: 'A la espalda, como la MOCHILA DE PROTONES de octubre: se lleva con cualquier sombrero.' },

    { id: 'efx_cohetes', name: 'COHETES', cat: 'efecto', carril: 'pago', galon: 20,
      ve: 'Por el camino van saliendo cohetes: suben con su cola de chispas y revientan en una palmera de colores que cae y se apaga. Uno de cada tres revienta del color del jugador.',
      ojo: 'Suben por encima del pasillo y se apagan rápido: no tapan las pastillas.' },

    { id: 'emo_uvas', name: 'DOCE UVAS', cat: 'emote', carril: 'gratis', galon: 10,
      ve: 'Una uva por campanada: se las va metiendo en la boca a toda prisa, con los mofletes a reventar y los ojos apretados, mientras el racimo de al lado se queda en nada.' }
  ];

  CAT.forEach(function (it) {
    it.chipCls = it.carril;
    it.chip = 'Galón ' + it.galon + ' · ' + (it.carril === 'pago' ? 'de pago' : 'gratis');
    it.gana = (it.carril === 'pago'
      ? 'Llegando al galón ' + it.galon + ' con el pase comprado.'
      : 'Llegando al galón ' + it.galon + ', juegue gratis o no.')
      + ' Solo en diciembre: no se vende en la tienda ni sale de un cofre.';
  });
