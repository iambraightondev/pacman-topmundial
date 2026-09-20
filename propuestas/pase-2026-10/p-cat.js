  /* ---------- Las cinco piezas del pase ---------- */
  var CAT = [
    { id: 'trampa', name: 'TRAMPA', cat: 'skin', carril: 'pago', galon: 30,
      ve: 'La caja de cazar fantasmas, de perfil: chapa gris con remaches, franja de peligro del color del jugador, rejilla, asa arriba y un testigo rojo que parpadea. Las dos puertas del frente son la boca; al abrirse se ve la luz de dentro, las rayas de energía cayendo hacia el fondo y el fantasma que ya tiene atrapado. Por detrás le sale la manguera, que se mece al correr.',
      q: 'Dispara el rayo: sale en zigzag por la boca, engancha un fantasma y lo mete de un tirón mientras la caja da un culatazo hacia atrás.',
      muerte: 'Se le sueltan los cierres: pega un brinco, las puertas se abren de golpe, se le escapa todo lo que había cazado y la caja cae de lado echando chispas y humo.',
      ojo: 'Es la única pieza del mes que se compra. Lo legendario se sigue ganando: esto es el escaparate, no lo mejor del juego.' },

    { id: 'acc_mochila', name: 'MOCHILA DE PROTONES', cat: 'accesorio', carril: 'pago', galon: 10,
      ve: 'El aparato a la espalda: caja de chapa con aletas de refrigeración, el acelerador asomando arriba con su luz verde latiendo, dos testigos en el panel y las correas cruzando el cuerpo. La manguera sube y deja el cañón tumbado sobre la coronilla, apuntando adelante. Vibra todo el rato y suelta vapor por la rejilla cada pocos segundos.',
      ojo: 'Es el accesorio más aparatoso después del FLOTADOR DE PATITO: sobresale por detrás y por arriba.' },

    { id: 'acc_visor', name: 'VISOR DE CAZA', cat: 'accesorio', carril: 'gratis', galon: 30,
      ve: 'Visor de detección por delante del ojo: cristal verde con un barrido que sube y baja, marco oscuro, reflejo de cristal y la correa dando la vuelta por detrás. Al lado lleva el medidor, con tres barritas que suben solas y una lucecita que parpadea cuando detecta algo.',
      ojo: 'Tapa el ojo, así que sobre las skins que son otro bicho (TRAMPA, T-REX) no se pondrá: va con las que mantienen la cara.' },

    { id: 'efx_ecto', name: 'ECTOPLASMA', cat: 'efecto', carril: 'pago', galon: 20,
      ve: 'Deja un rastro de baba verde fosforescente: charquitos que se van aplastando y apagando, con burbujas que asoman y revientan y algún hilo que gotea.',
      ojo: 'Verde sobre azul del laberinto: se lee bien y no tapa las pastillas.' },

    { id: 'emo_grito', name: 'GRITO', cat: 'emote', carril: 'gratis', galon: 10,
      ve: 'El grito del cuadro: cara estirada con las dos manos a los lados, ojos huecos de espanto, cejas levantadas del todo y la boca en un óvalo negro que late. Tiembla, y del grito salen ondas hacia arriba.' }
  ];

  CAT.forEach(function (it) {
    it.chipCls = it.carril;
    it.chip = 'Galón ' + it.galon + ' · ' + (it.carril === 'pago' ? 'de pago' : 'gratis');
    it.gana = (it.carril === 'pago'
      ? 'Llegando al galón ' + it.galon + ' con el pase comprado.'
      : 'Llegando al galón ' + it.galon + ', juegue gratis o no.')
      + ' Solo en octubre: no se vende en la tienda ni sale de un cofre.';
  });
