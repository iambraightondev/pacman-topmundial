/* ============================================================
 * PAC-MAN TOP MUNDIAL — js/portadas.js
 * Las PORTADAS de los modos: un póster animado por modo para el carrusel
 * de la portada. Define window.PM.Portadas
 *
 * Elegidas por Braighton el 17 sep 2026 (propuesta B · Retrato): un solo
 * protagonista enorme por modo, con rayas en diagonal, halo de su color y
 * viñeta. El título, la etiqueta y la frase van en el DOM (ui.js); aquí solo
 * se pinta el lienzo, siempre en 360×470 lógicos, sea cual sea su tamaño.
 *
 * Algunos pósters cambian de color mientras se mueven (LABERINTOS con cada
 * trazado, ONLINE con cada jugador): lo dejan en estado.color, y la tarjeta
 * entera (borde, etiqueta, título) se tiñe con él.
 * ============================================================ */
(function () {
  'use strict';
  window.PM = window.PM || {};
  var CFG = window.PM.CFG;
  var W = 360, H = 470;
  var D = CFG.DIR;
  var Sp = {
    drawPacman: function () { return window.PM.Sprites.drawPacman.apply(window.PM.Sprites, arguments); },
    drawGhost: function () { return window.PM.Sprites.drawGhost.apply(window.PM.Sprites, arguments); }
  };

  /* color de cada póster (CACERÍA en el rojo de Blinky) y su frase */
  var COLOR = { clasico: '#ffff00', duo: '#00ff00', hab: '#ff66cc', caza: '#ff2a2a', lab: '#ffb852', online: '#7ec8ff' };
  var FRASE = {
    clasico: 'EL ARCADE DE 1980, TAL CUAL. EL QUE CUENTA PARA EL TOP MUNDIAL.',
    duo: 'J1 CON FLECHAS, J2 CON WASD. EL MISMO LABERINTO, A LA VEZ.',
    hab: 'CUATRO PODERES CON SU RECARGA. MUERDE ANTES DE QUE TE MUERDAN.',
    caza: 'TODOS DE FANTASMA CONTRA UN PAC-MAN DE MÁQUINA.',
    lab: 'OTROS LABERINTOS, LOS MISMOS FANTASMAS.',
    online: 'DE 2 A 4, CADA UNO EN SU CASA, CON CÓDIGO DE SALA.'
  };

  function aTile(c, z, x, y, fn) { c.save(); c.translate(x, y); c.scale(z, z); try { fn(); } catch (e) { } c.restore(); }

  function fondoPoster(c, color, t) {
    var g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#000'); g.addColorStop(1, '#0a0a1a');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    c.save(); c.globalAlpha = 0.16; c.fillStyle = color;
    var off = (t * 30) % 40;
    for (var x = -H; x < W + H; x += 40) {
      c.beginPath(); c.moveTo(x + off, 0); c.lineTo(x + off + 14, 0); c.lineTo(x + off + 14 - H, H); c.lineTo(x + off - H, H); c.fill();
    }
    c.restore();
    var halo = c.createRadialGradient(W / 2, H * 0.4, 20, W / 2, H * 0.4, 240);
    halo.addColorStop(0, color + '55'); halo.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = halo; c.fillRect(0, 0, W, H);
  }
  function vineta(c) {
    var r = c.createRadialGradient(W / 2, H * 0.4, 10, W / 2, H * 0.4, 270);
    r.addColorStop(0, 'rgba(0,0,0,0)'); r.addColorStop(1, 'rgba(0,0,0,.75)');
    c.fillStyle = r; c.fillRect(0, 0, W, H);
  }
  function sombraAbajo(c) {
    var s = c.createLinearGradient(0, H * 0.58, 0, H);
    s.addColorStop(0, 'rgba(0,0,0,0)'); s.addColorStop(1, 'rgba(0,0,0,.92)');
    c.fillStyle = s; c.fillRect(0, 0, W, H);
  }

  var RETRATO={
    /* P1 · CLÁSICO: se queda como estaba */
    clasico:function(c,m,t,e){
      var ciclo=t%3, cerca=ciclo<1.6;
      if(cerca){var px=W*0.9-ciclo/1.6*W*0.32;c.fillStyle='#ffb8ae';c.beginPath();c.arc(px,H*0.4,22+Math.sin(t*20)*2,0,7);c.fill();}
      else{c.fillStyle='rgba(33,33,255,'+(0.35*(1-(ciclo-1.6)/1.4))+')';c.fillRect(0,0,W,H);}
      aTile(c,17,W*0.36,H*0.4,function(){Sp.drawPacman(c,0,0,D.RIGHT,[0,1,2,1][Math.floor(t*6)%4],'#ffff00','clasico',{});});
      aTile(c,5,W*0.84,H*0.66,function(){Sp.drawGhost(c,0,0,D.LEFT,0,cerca?'chase':'fright',Math.floor(t*8)%2,false);});
    },

    /* P2 · DOS JUGADORES: espalda con espalda, rodeados. Los fantasmas se
     * acercan desde las esquinas y, cuando están encima, los dos se comen la
     * pastilla a la vez y los cuatro huyen en azul. */
    duo:function(c,m,t,e){
      var ciclo=t%4, cerco=Math.min(1,ciclo/2.2), poder=ciclo>2.4;
      var cx=W/2, cy=H*0.38;
      if(poder&&ciclo<2.7){c.fillStyle='rgba(255,255,255,'+(0.5*(1-(ciclo-2.4)/0.3))+')';c.fillRect(0,0,W,H);}
      var esq=[[-1,-1],[1,-1],[-1,1],[1,1]];
      for(var i=0;i<4;i++){
        var d=poder?(1+(ciclo-2.4)*0.9):(1.9-cerco*0.95);
        var gx=cx+esq[i][0]*W*0.24*d, gy=cy+esq[i][1]*H*0.17*d;
        (function(i,gx,gy){aTile(c,4.5,gx,gy,function(){
          Sp.drawGhost(c,0,0,poder?(esq[i][0]<0?D.LEFT:D.RIGHT):(esq[i][0]<0?D.RIGHT:D.LEFT),i,poder?'fright':'chase',Math.floor(t*8)%2,poder&&ciclo>3.5&&Math.floor(t*6)%2===0);});})(i,gx,gy);
      }
      var tiembla=poder?0:Math.sin(t*30)*cerco*1.5;
      aTile(c,9,cx-W*0.19+tiembla,cy,function(){Sp.drawPacman(c,0,0,D.LEFT,[0,1,2,1][Math.floor(t*(poder?14:5))%4],'#ffff00','clasico',{});});
      aTile(c,9,cx+W*0.19-tiembla,cy,function(){Sp.drawPacman(c,0,0,D.RIGHT,[0,1,2,1][Math.floor(t*(poder?14:5)+2)%4],'#00ff00','clasico',{});});
      c.font='9px "Press Start 2P",monospace';c.textAlign='center';c.textBaseline='middle';
      c.fillStyle='#ffff00';c.fillText('J1',cx-W*0.19,cy+72);c.fillStyle='#00ff00';c.fillText('J2',cx+W*0.19,cy+72);
    },

    /* P3 · DESATADO: la dentellada con colmillos de verdad, dibujados a mano
     * a este tamaño (el de la partida no aguanta tanto zoom). */
    hab:function(c,m,t,e){
      var ciclo=t%1.6, cx=W*0.44, cy=H*0.38, R=118;
      // boca: se abre despacio y se cierra de golpe
      var ab=ciclo<1.05?Math.min(1,ciclo/0.9):Math.max(0,1-(ciclo-1.05)/0.12);
      var ang=0.08+ab*0.62;
      var g=c.createRadialGradient(cx-R*0.35,cy-R*0.4,10,cx,cy,R);g.addColorStop(0,'#ff9adf');g.addColorStop(1,'#d63c9e');
      c.fillStyle=g;c.beginPath();c.moveTo(cx,cy);c.arc(cx,cy,R,ang,Math.PI*2-ang);c.closePath();c.fill();
      // interior de la boca
      c.fillStyle='#2a0020';c.beginPath();c.moveTo(cx,cy);c.arc(cx,cy,R*0.97,-ang,ang);c.closePath();c.fill();
      // colmillos: triángulos a lo largo de cada labio, apuntando hacia dentro
      function colmillos(signo){
        var lab=signo*ang, ux=Math.cos(lab), uy=Math.sin(lab);
        var nx=-uy*signo, ny=ux*signo;          // hacia dentro de la boca
        for(var k=0;k<5;k++){
          var a0=R*(0.3+k*0.14), a1=a0+R*0.12, largo=R*(k===4?0.2:0.13);
          var mx=(a0+a1)/2;
          c.beginPath();
          c.moveTo(cx+ux*a0,cy+uy*a0);c.lineTo(cx+ux*a1,cy+uy*a1);
          c.lineTo(cx+ux*mx-nx*largo,cy+uy*mx-ny*largo);
          c.closePath();
          c.fillStyle='#fff';c.fill();c.lineWidth=2;c.strokeStyle='#c9b8c4';c.stroke();
        }
      }
      if(ang>0.3){c.save();c.beginPath();c.arc(cx,cy,R*0.99,0,7);c.clip();colmillos(1);colmillos(-1);c.restore();}
      // el fantasma que se lleva el mordisco
      var gx=cx+R*1.02, gy=cy;
      if(ciclo<1.05){aTile(c,4.5,gx+ (1.05-ciclo)*40,gy,function(){Sp.drawGhost(c,0,0,D.LEFT,1,'chase',Math.floor(t*8)%2,false);});}
      else{var k2=(ciclo-1.05)/0.55;
        aTile(c,4.5,gx+k2*60,gy-k2*140,function(){Sp.drawGhost(c,0,0,D.RIGHT,1,'eyes',0,false);});
        c.fillStyle='#fff';for(var i=0;i<12;i++){var a=i*0.52,r=20+k2*90;c.fillRect(gx+Math.cos(a)*r-3,gy+Math.sin(a)*r-3,6,6);}
        c.fillStyle='rgba(255,102,204,'+(0.35*(1-k2))+')';c.fillRect(0,0,W,H);}
    },

    /* P4 · CACERÍA: BLINKY gigante; sus ojos siguen al ratón */
    caza:function(c,m,t,e){
      var dir=e.dir!=null?e.dir:[D.LEFT,D.DOWN,D.RIGHT,D.UP][Math.floor(t/1.2)%4];
      aTile(c,16,W*0.5,H*0.36+Math.sin(t*2)*6,function(){Sp.drawGhost(c,0,0,dir,0,'chase',Math.floor(t*6)%2,false);});
      var px=(t*70)%(W+60)-30;
      aTile(c,3,px,H*0.66,function(){Sp.drawPacman(c,0,0,D.RIGHT,[0,1,2,1][Math.floor(t*14)%4],'#ffff00','clasico',{});});
    },

    /* P5 · LABERINTOS: primerísimo plano de una esquina del laberinto, con
     * paredes de neón gruesas. Pac-Man enorme entra por abajo, gira la esquina
     * y sale; a cada vuelta el laberinto cambia de color (es otro trazado). */
    lab:function(c,m,t,e){
      var vuelta=Math.floor(t/2.6), p=(t%2.6)/2.6;
      var cols=['#ffb852','#ff66cc','#00ffff','#7ec8ff'], col=cols[vuelta%cols.length];
      e.color=col;                                          // y la tarjeta, del color del laberinto
      var anchoP=140, x0=W*0.36-anchoP/2, yEsq=H*0.2;
      function pared(pts){c.beginPath();pts.forEach(function(q,i){i?c.lineTo(q[0],q[1]):c.moveTo(q[0],q[1]);});
        c.lineWidth=30;c.strokeStyle=col;c.globalAlpha=0.16;c.stroke();c.globalAlpha=1;
        c.lineWidth=11;c.strokeStyle=col;c.stroke();c.lineWidth=2;c.strokeStyle='rgba(255,255,255,.55)';c.stroke();}
      c.lineJoin='round';c.lineCap='round';
      // pared exterior (izquierda y arriba) e interior (derecha y abajo)
      pared([[x0,H+20],[x0,yEsq+20],[x0+20,yEsq],[W+20,yEsq]]);
      pared([[x0+anchoP,H+20],[x0+anchoP,yEsq+anchoP],[W+20,yEsq+anchoP]]);
      // pastillas del pasillo
      var cxp=x0+anchoP/2, cyp=yEsq+anchoP/2, ys=H*0.74, recorrido=(ys-cyp)+(W-cxp)+60;
      var d=p*recorrido;
      c.fillStyle='#ffb8ae';
      for(var yy=ys;yy>cyp;yy-=40){var dd=ys-yy;if(dd>d)c.fillRect(cxp-6,yy-6,12,12);}
      for(var xx=cxp+40;xx<W;xx+=40){var d2=(ys-cyp)+(xx-cxp);if(d2>d)c.fillRect(xx-6,cyp-6,12,12);}
      // Pac-Man
      var px,py,dr;
      if(d<ys-cyp){px=cxp;py=ys-d;dr=D.UP;}else{px=cxp+(d-(ys-cyp));py=cyp;dr=D.RIGHT;}
      aTile(c,8,px,py,function(){Sp.drawPacman(c,0,0,dr,[0,1,2,1][Math.floor(t*12)%4],'#ffff00','clasico',{});});
      // número de laberinto
      c.font='10px "Press Start 2P",monospace';c.textAlign='left';c.fillStyle=col;c.fillText('LABERINTO '+(vuelta%cols.length+1)+'/6',18,52);
    },

    /* P6 · ONLINE: el símbolo del wifi cargando. El punto de abajo es un
     * Pac-Man que mira hacia la señal y cambia de color (los cuatro
     * jugadores); las barras se encienden una a una. */
    online:function(c,m,t,e){
      var cols=CFG.PLAYER_COLORS, cx=W/2, base=H*0.5;
      var paso=Math.floor(t/0.7), col=cols[paso%4], fase=(t%0.7)/0.7;
      e.color=col;                                          // la tarjeta entera va del color del jugador
      var carga=(t%2.4)/2.4, barras=Math.floor(carga*4);   // 0..3 encendidas
      // halo del color del jugador que toca
      var h=c.createRadialGradient(cx,base-80,20,cx,base-80,230);h.addColorStop(0,col+'40');h.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=h;c.fillRect(0,0,W,H);
      // las tres barras del wifi
      c.lineCap='round';
      for(var i=0;i<3;i++){
        var r=66+i*52, on=barras>i, ang=0.78;
        c.beginPath();c.arc(cx,base,r,-Math.PI/2-ang,-Math.PI/2+ang);
        c.lineWidth=30;c.strokeStyle=on?col:'#151530';c.globalAlpha=on?0.22:1;c.stroke();c.globalAlpha=1;
        c.lineWidth=20;c.strokeStyle=on?col:'#1c1c3c';c.stroke();
        if(on){c.lineWidth=4;c.strokeStyle='rgba(255,255,255,.5)';c.stroke();}
      }
      // el Pac-Man del punto: mira arriba, come señal, y al cambiar de color da un salto
      var salto=fase<0.25?Math.sin(fase/0.25*Math.PI)*14:0;
      aTile(c,6.5,cx,base-salto,function(){Sp.drawPacman(c,0,0,D.UP,[0,1,2,1][Math.floor(t*10)%4],col,'clasico',{});});
      if(fase<0.3){c.strokeStyle=col;c.globalAlpha=1-fase/0.3;c.lineWidth=3;c.beginPath();c.arc(cx,base-salto,44+fase*120,0,7);c.stroke();c.globalAlpha=1;}
      // quién es y el código de la sala
      c.font='10px "Press Start 2P",monospace';c.textAlign='center';c.textBaseline='middle';c.fillStyle=col;
      c.fillText('J'+(paso%4+1)+(barras>=3?' · CONECTADO':' · CONECTANDO'+'...'.slice(0,Math.floor(t*3)%4)),cx,base+54);
      var by=base+84;
      c.fillStyle='rgba(0,0,0,.8)';c.strokeStyle=col;c.lineWidth=2;c.beginPath();c.rect(cx-62,by-14,124,28);c.fill();c.stroke();
      c.fillStyle='#fff';c.fillText('SALA K7Q2',cx,by+1);
    }
  };


  var Portadas = {
    W: W, H: H,
    color: function (id, estado) { return (estado && estado.color) || COLOR[id] || '#ffff00'; },
    frase: function (id) { return FRASE[id] || ''; },

    /* Pinta el póster del modo id en el lienzo cv (cualquier tamaño con la
     * proporción 360×470). t: segundos. estado: { dir, color }: dir es hacia
     * dónde mira el ratón (los ojos de Blinky) y color lo deja el póster. */
    pintar: function (cv, id, t, estado) {
      var escena = RETRATO[id];
      if (!cv || !escena || !cv.getContext) return;
      estado = estado || {};
      var c = cv.getContext('2d');
      if (!c || !c.setTransform) return;
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.clearRect(0, 0, cv.width, cv.height);
      c.setTransform(cv.width / W, 0, 0, cv.height / H, 0, 0);
      try {
        fondoPoster(c, this.color(id, estado), t);
        escena(c, { id: id, color: COLOR[id] }, t, estado);
        vineta(c);
        sombraAbajo(c);
      } catch (e) { /* un dibujo raro no rompe la portada */ }
      c.setTransform(1, 0, 0, 1, 0, 0);
    }
  };

  window.PM.Portadas = Portadas;
})();
