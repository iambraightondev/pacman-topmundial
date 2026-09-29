  /* ---------- Las cinco piezas del pase de diciembre ---------- */
  var CAT = [
    { id: 'retablo', name: 'RETABLO', cat: 'skin', carril: 'pago', galon: 30,
      ve: 'El retablo ayacuchano: un cajón de madera con techo a dos aguas, pintado de flores y con la madera del color del jugador. Dentro, en su nicho azul, el nacimiento: la Virgen, San José, el Niño en el pesebre y una llamita, con la estrella encima. El cajón de abajo es la boca.',
      q: 'Se enciende por dentro: el nicho se llena de luz dorada, sale la estrella de Belén con sus rayos por el techo y suena el villancico.',
      muerte: 'Se le va la luz, el cajón se desarma en tablas que caen, las figuritas del nacimiento saltan fuera y la estrella se apaga la última.',
      ojo: 'Navidad de aquí, no del Polo Norte: el gorro de Papá Noel ya lo regala CLAUS-MAN del 20 de diciembre al 6 de enero, así que el pase no le pisa nada.' },

    { id: 'acc_paneton', name: 'PANETÓN', cat: 'accesorio', carril: 'pago', galon: 10,
      ve: 'Un panetón entero en la cabeza, recién salido: la cúpula dorada con sus frutas confitadas y pasas, el molde de papel a pliegues del color del jugador y un hilito de vapor.',
      ojo: 'Va a la cabeza, como el RAMEN de la tanda yōkai o la chistera.' },

    { id: 'acc_belen', name: 'ESTRELLA DE BELÉN', cat: 'accesorio', carril: 'gratis', galon: 30,
      ve: 'La estrella que corona el pesebre, flotando sobre la cabeza con su resplandor y su cola de cometa hacia atrás: sube y baja despacio y titila.',
      ojo: 'La del carril gratis tiene que lucir: brilla sola y se lleva con cualquier skin.' },

    { id: 'efx_foquitos', name: 'FOQUITOS', cat: 'efecto', carril: 'pago', galon: 20,
      ve: 'Por donde pasa deja una tira de foquitos de colores colgando de su cable, que se encienden por turnos, como los del balcón en diciembre.',
      ojo: 'Luz de colores pegada al suelo del pasillo: se lee bien y no tapa las pastillas.' },

    { id: 'emo_chocolatada', name: 'CHOCOLATADA', cat: 'emote', carril: 'gratis', galon: 10,
      ve: 'La taza de chocolate caliente de la chocolatada: sopla, sorbe, se queda con el bigote de chocolate y suspira de gusto con los ojos cerrados.' }
  ];

  CAT.forEach(function (it) {
    it.chipCls = it.carril;
    it.chip = 'Galón ' + it.galon + ' · ' + (it.carril === 'pago' ? 'de pago' : 'gratis');
    it.gana = (it.carril === 'pago'
      ? 'Llegando al galón ' + it.galon + ' con el pase comprado.'
      : 'Llegando al galón ' + it.galon + ', juegue gratis o no.')
      + ' Solo en diciembre: no se vende en la tienda ni sale de un cofre.';
  });
