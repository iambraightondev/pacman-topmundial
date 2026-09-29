  /* ---------- Las cinco piezas del pase de noviembre ---------- */
  var CAT = [
    { id: 'alebrije', name: 'ALEBRIJE', cat: 'skin', carril: 'pago', galon: 30,
      ve: 'El bicho imposible de los artesanos de Oaxaca: medio gato, medio dragón, con orejas de punta, alas de mariposa que baten en el lomo y cola en espiral, todo pintado a lunares y rayas de colores. La cara lleva el color del jugador; el hocico es la boca, con sus dos colmillitos, y anda a saltitos con sus cuatro patas.',
      q: 'La fiesta de color: las alas se abren del todo y aletean, la pintura baila de sitio y echa por la boca una lluvia de chispas de colores hacia delante.',
      muerte: 'Se destiñe: la pintura salta a escamas de colores, debajo queda la madera sin pintar, se raja y se parte en trozos que caen.',
      ojo: 'Es la única pieza del mes que se compra. Los alebrijes guían a las almas en la fiesta: en un juego de fantasmas, el guía es el que se lleva el pase.' },

    { id: 'acc_catrina', name: 'SOMBRERO CATRINA', cat: 'accesorio', carril: 'pago', galon: 10,
      ve: 'El de la Calavera Garbancera: ala enorme y oscura con borde de encaje, cinta del color del jugador, un ramillete delante (cempasúchil, una rosa y una margarita) y una pluma blanca que se mece por detrás.',
      ojo: 'Es un sombrero, así que en las extravagantes va a la coronilla como la chistera.' },

    { id: 'acc_cempasuchil', name: 'CEMPASÚCHIL', cat: 'accesorio', carril: 'gratis', galon: 30,
      ve: 'La flor naranja de los muertos, prendida detrás de la oreja con su hoja: gira despacio, late un poco y cada par de segundos suelta un pétalo que se va volando hacia atrás.',
      ojo: 'Pequeña a propósito: la del carril gratis se tiene que poder llevar con todo.' },

    { id: 'efx_velitas', name: 'VELITAS', cat: 'efecto', carril: 'pago', galon: 20,
      ve: 'Deja velitas encendidas en el suelo, como el camino que lleva a la ofrenda: se van consumiendo, la llama tiembla y se achica, y al final se apagan con su hilito de humo. Una de cada tres es del color del jugador.',
      ojo: 'Luz cálida sobre el azul del laberinto: se lee bien y no tapa las pastillas.' },

    { id: 'emo_calaverita', name: 'CALAVERITA', cat: 'emote', carril: 'gratis', galon: 10,
      ve: 'La cara se vuelve calaverita de azúcar: blanca, con las cuencas rodeadas de pétalos del color del jugador, flor en la frente, nariz de corazón y la boca cosida. Se ríe castañeteando la mandíbula y meciéndose.' }
  ];

  CAT.forEach(function (it) {
    it.chipCls = it.carril;
    it.chip = 'Galón ' + it.galon + ' · ' + (it.carril === 'pago' ? 'de pago' : 'gratis');
    it.gana = (it.carril === 'pago'
      ? 'Llegando al galón ' + it.galon + ' con el pase comprado.'
      : 'Llegando al galón ' + it.galon + ', juegue gratis o no.')
      + ' Solo en noviembre: no se vende en la tienda ni sale de un cofre.';
  });
