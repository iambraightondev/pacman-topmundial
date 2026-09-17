/* ============================================================
 * PAC-MAN TOP MUNDIAL — js/emblemas.js
 * Los EMBLEMAS de las maestrías: oro con incrustaciones verde azulado y una
 * silueta que evoluciona escalón a escalón (pilar, alas, arco, escudo con
 * cuernos, anillo, y arriba del todo el sol con la gema tallada). Cada
 * emblema se ARMA pieza a pieza: arm son los segundos desde que empezó.
 *
 * Añade a Sprites:
 *   drawEmblem(ctx, rango, t, arm)  pinta el rango 0..5 en un lienzo lógico
 *                                   de 200x240 (la transformación la pone
 *                                   quien llama); arm null = ya armado
 *   drawEmblemOff(ctx, rango, w, h) la silueta apagada de uno que no tienes,
 *                                   ocupando w x h píxeles reales
 *   EMBLEM_GEMA                     el color de la gema de cada rango
 *   EMBLEM_FIN                      segundos que tarda en armarse cada uno
 * ============================================================ */
(function () {
  'use strict';
  window.PM = window.PM || {};
  var S = window.PM.Sprites;
  if (!S) return;
  var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var GEMA=['#8fb3d9','#18e0ff','#1fe06a','#ff5fd2','#ff7a1a','#ffe23a'];
  function rgba(h,a){var n=parseInt(h.slice(1),16);return 'rgba('+(n>>16&255)+','+(n>>8&255)+','+(n&255)+','+a+')';}
  function grad(c,y0,y1,p){var g=c.createLinearGradient(-40,y0,40,y1);g.addColorStop(0,p[2]);g.addColorStop(.3,p[0]);g.addColorStop(.55,p[1]);g.addColorStop(.78,p[0]);g.addColorStop(1,p[3]);return g;}
  function poly(c,pts){c.beginPath();pts.forEach(function(q,i){c[i?'lineTo':'moveTo'](q[0],q[1]);});c.closePath();}
  function espejo(c,fn){fn(1);c.save();c.scale(-1,1);fn(-1);c.restore();}
  function pieza(c,pts,p,y0,y1){poly(c,pts);c.fillStyle=grad(c,y0,y1,p);c.fill();c.lineWidth=2.4;c.strokeStyle=p[3];c.stroke();
    c.save();poly(c,pts);c.clip();c.lineWidth=2;c.strokeStyle='rgba(255,255,255,.35)';c.translate(.8,1.2);poly(c,pts);c.stroke();c.restore();}

  /* ---------- la familia: oro con incrustaciones verde azulado ---------- */
  var ORO_L='#fff0b8',ORO_1='#e6c270',ORO_2='#c69a45',ORO_3='#8e6420',ORO_B='#5a3d0c',AZUL='#0c3a3d',AZUL2='#12555a',FILO='#d9b35f';
  function oro(c,camino,y0,y1,sombra){
    c.beginPath();camino();var g=c.createLinearGradient(0,y0,0,y1);g.addColorStop(0,ORO_L);g.addColorStop(.25,ORO_1);g.addColorStop(.7,ORO_2);g.addColorStop(1,ORO_3);
    c.fillStyle=g;c.fill();
    c.save();c.beginPath();camino();c.clip();c.fillStyle='rgba(70,40,0,.22)';c.fillRect(0,-200,200,400);
    c.translate(.6,1);c.beginPath();camino();c.lineWidth=1.6;c.strokeStyle='rgba(255,255,255,.45)';c.stroke();c.restore();
    c.beginPath();camino();c.lineWidth=2.4;c.strokeStyle=ORO_B;c.stroke();
  }
  function azul(c,camino){c.beginPath();camino();var g=c.createLinearGradient(0,-60,0,60);g.addColorStop(0,AZUL2);g.addColorStop(1,AZUL);c.fillStyle=g;c.fill();c.lineWidth=2.6;c.strokeStyle=FILO;c.stroke();c.lineWidth=1;c.strokeStyle=ORO_B;c.stroke();}
  function tallas(c,segs){c.save();c.strokeStyle='rgba(90,61,12,.8)';c.lineWidth=1.4;segs.forEach(function(s){c.beginPath();c.moveTo(s[0],s[1]);c.lineTo(s[2],s[3]);c.stroke();});
    c.strokeStyle='rgba(255,240,184,.35)';c.lineWidth=1;segs.forEach(function(s){c.beginPath();c.moveTo(s[0]+1,s[1]+1);c.lineTo(s[2]+1,s[3]+1);c.stroke();});c.restore();}

  /* ala derecha: banda inclinada verde azulada con filetes de oro */
  function ala(c,x0,y0,L,h,sube,n){
    var A=[x0,y0],Bp=[x0+L,y0-sube],Cp=[x0+L,y0-sube+h*.62],Dp=[x0+L*.3,y0+h];
    azul(c,function(){c.moveTo(A[0],A[1]);c.lineTo(Bp[0],Bp[1]);c.lineTo(Cp[0],Cp[1]);c.lineTo(Dp[0],Dp[1]);c.lineTo(x0,y0+h);c.closePath();});
    c.save();c.strokeStyle=FILO;c.lineWidth=2;
    for(var k=1;k<=n;k++){var f=k/(n+1);var ix=x0,iy=y0+h*f,ox=Bp[0],oy=Bp[1]+(Cp[1]-Bp[1])*f;c.beginPath();c.moveTo(ix+4,iy);c.lineTo(ox-3,oy);c.stroke();}
    c.restore();
    // remate de oro en la punta
    oro(c,function(){c.moveTo(Bp[0]-2,Bp[1]-3);c.lineTo(Bp[0]+5,Bp[1]-8);c.lineTo(Cp[0]+5,Cp[1]-4);c.lineTo(Cp[0]-2,Cp[1]);c.closePath();},Bp[1]-8,Cp[1]);
  }
  /* arcos que bajan desde las alas hacia la base */
  function arcos(c,cy,R,bandas){
    for(var b=0;b<bandas;b++){var r=R+b*13;
      [[-.08,.42],[.58,1.08]].forEach(function(rg){
        c.beginPath();c.arc(0,cy,r,Math.PI*rg[0],Math.PI*rg[1]);c.lineWidth=9;c.strokeStyle=AZUL;c.stroke();
        c.lineWidth=2.2;c.strokeStyle=FILO;c.beginPath();c.arc(0,cy,r+5,Math.PI*rg[0],Math.PI*rg[1]);c.stroke();c.beginPath();c.arc(0,cy,r-5,Math.PI*rg[0],Math.PI*rg[1]);c.stroke();
      });}
  }
  /* el pilar central */
  function pilar(c,w,top,bot,notch,grabado){
    var cam=function(){c.moveTo(-w,top);c.lineTo(0,top+notch);c.lineTo(w,top);c.lineTo(w,bot-w*1.3);c.lineTo(0,bot);c.lineTo(-w,bot-w*1.3);c.closePath();};
    oro(c,cam,top,bot);
    var segs=[[0,top+notch+4,0,bot-6]];
    if(grabado>=1){segs.push([-w*.5,top+notch+8,-w*.5,bot-w*1.6],[w*.5,top+notch+8,w*.5,bot-w*1.6]);}
    if(grabado>=2){for(var k=0;k<3;k++){var y=top+26+k*18;segs.push([-w*.5,y,0,y+7],[w*.5,y,0,y+7]);}}
    tallas(c,segs);
  }
  /* el escudo con cuernos (de MAESTRO en adelante) */
  function escudo(c,W,top,bot,cuerno){
    var cam=function(){c.moveTo(0,top+16);c.lineTo(W*.35,top+2);c.lineTo(W+cuerno,top-cuerno*.7);c.lineTo(W,top+22);c.lineTo(W*.86,bot-34);c.lineTo(0,bot);c.lineTo(-W*.86,bot-34);c.lineTo(-W,top+22);c.lineTo(-W-cuerno,top-cuerno*.7);c.lineTo(-W*.35,top+2);c.closePath();};
    oro(c,cam,top-cuerno,bot);
    tallas(c,[[-W*.72,top+26,-W*.62,bot-40],[W*.72,top+26,W*.62,bot-40]]);
  }
  /* la gema */
  function joya(c,x,y,R,col,tipo,resp){
    c.save();c.translate(x,y);
    var pts;
    if(tipo==='rombo')pts=[[0,-R],[R*.8,0],[0,R],[-R*.8,0]];
    else if(tipo==='hex')pts=[[0,-R],[R*.7,-R*.5],[R*.7,R*.5],[0,R],[-R*.7,R*.5],[-R*.7,-R*.5]];
    else pts=[[0,-R*1.45],[R*.6,-R*.55],[R*.6,R*.55],[0,R*1.1],[-R*.6,R*.55],[-R*.6,-R*.55]];
    var cam=function(){c.beginPath();pts.forEach(function(q,i){c[i?'lineTo':'moveTo'](q[0],q[1]);});c.closePath();};
    c.shadowColor=col;c.shadowBlur=8+10*resp;cam();c.fillStyle=col;c.fill();c.shadowBlur=0;
    cam();var g=c.createLinearGradient(-R,-R,R,R);g.addColorStop(0,'rgba(255,255,255,.75)');g.addColorStop(.4,'rgba(255,255,255,0)');g.addColorStop(1,'rgba(0,0,0,.55)');c.fillStyle=g;c.fill();
    c.strokeStyle='rgba(255,255,255,.35)';c.lineWidth=1;pts.forEach(function(q){c.beginPath();c.moveTo(0,0);c.lineTo(q[0]*.5,q[1]*.5);c.stroke();});
    c.beginPath();pts.forEach(function(q,i){c[i?'lineTo':'moveTo'](q[0]*.5,q[1]*.5);});c.closePath();c.stroke();
    cam();c.lineWidth=3;c.strokeStyle=ORO_B;c.stroke();cam();c.lineWidth=1.2;c.strokeStyle=FILO;c.stroke();
    c.restore();
  }
  /* el estandarte de arriba */
  function estandarte(c,y,col,alto){
    c.save();c.translate(0,y);
    var cam=function(){c.beginPath();c.moveTo(-8,-alto);c.lineTo(8,-alto);c.lineTo(8,0);c.lineTo(0,9);c.lineTo(-8,0);c.closePath();};
    c.shadowColor=col;c.shadowBlur=10;cam();c.fillStyle=col;c.fill();c.shadowBlur=0;
    cam();var g=c.createLinearGradient(-8,0,8,0);g.addColorStop(0,'rgba(255,255,255,.35)');g.addColorStop(.5,'rgba(255,255,255,0)');g.addColorStop(1,'rgba(0,0,0,.35)');c.fillStyle=g;c.fill();
    c.restore();
  }

  /* el anillo cerrado (LEYENDA en adelante), con remaches de oro */
  function anillo(c,cy,R){
    c.beginPath();c.arc(0,cy,R,0,7);c.lineWidth=10;c.strokeStyle=AZUL;c.stroke();
    c.lineWidth=2.2;c.strokeStyle=FILO;c.beginPath();c.arc(0,cy,R+5.5,0,7);c.stroke();c.beginPath();c.arc(0,cy,R-5.5,0,7);c.stroke();
    for(var k=0;k<8;k++){var a=k*Math.PI/4+Math.PI/8,x=Math.cos(a)*R,y=cy+Math.sin(a)*R;
      oro(c,function(){c.moveTo(x,y-4);c.lineTo(x+4,y);c.lineTo(x,y+4);c.lineTo(x-4,y);c.closePath();},y-4,y+4);}
  }
  /* la incrustación verde azulada dentro del escudo */
  function incrusta(c,W,top,bot){
    azul(c,function(){c.moveTo(0,top+14);c.lineTo(W*.4,top+4);c.lineTo(W*.82,top+12);c.lineTo(W*.66,bot-26);c.lineTo(0,bot);c.lineTo(-W*.66,bot-26);c.lineTo(-W*.82,top+12);c.lineTo(-W*.4,top+4);c.closePath();});
  }
  /* el sol de rayos de oro detrás de TOP MUNDIAL, girando despacio */
  function sol(c,cy,t){
    c.save();c.translate(0,cy);c.rotate(t*.08);
    for(var k=0;k<20;k++){c.rotate(Math.PI/10);var lar=k%2?92:108,gr=c.createLinearGradient(0,-40,0,-lar);gr.addColorStop(0,'rgba(230,194,112,.9)');gr.addColorStop(1,'rgba(230,194,112,0)');
      c.fillStyle=gr;c.beginPath();c.moveTo(-5,-40);c.lineTo(0,-lar);c.lineTo(5,-40);c.closePath();c.fill();}
    c.restore();
  }
  /* la gema de la cima de TOP MUNDIAL: un cristal tallado en su engaste de oro */
  function gemaCima(c,y,col,resp,t){
    c.save();c.translate(0,y+Math.sin(t*1.4)*1.5);
    // engaste: la cuna de oro con dos garras y las aletas
    espejo(c,function(){oro(c,function(){c.moveTo(4,14);c.lineTo(17,0);c.lineTo(27,-8);c.lineTo(24,4);c.lineTo(12,20);c.closePath();},-8,20);});
    oro(c,function(){c.moveTo(-15,8);c.lineTo(15,8);c.lineTo(6,26);c.lineTo(0,32);c.lineTo(-6,26);c.closePath();},8,32);
    // el cristal: seis caras con luz a la izquierda y sombra a la derecha
    var T=[0,-36],L1=[-12,-14],R1=[12,-14],L2=[-13,6],R2=[13,6],Bt=[0,24],C=[0,-8],D=[0,8];
    c.shadowColor=col;c.shadowBlur=14+14*resp;
    poly(c,[T,R1,R2,Bt,L2,L1]);c.fillStyle=col;c.fill();c.shadowBlur=0;
    var caras=[[T,L1,C,'rgba(255,255,255,.62)'],[T,C,R1,'rgba(255,255,255,.22)'],[L1,L2,D,C,'rgba(255,255,255,.3)'],[R1,C,D,R2,'rgba(0,0,0,.18)'],[L2,Bt,D,'rgba(0,0,0,.12)'],[D,Bt,R2,'rgba(0,0,0,.42)']];
    caras.forEach(function(f){poly(c,f.slice(0,-1));c.fillStyle=f[f.length-1];c.fill();});
    c.strokeStyle='rgba(255,255,255,.45)';c.lineWidth=1;[[T,C],[L1,C],[R1,C],[C,D],[L2,D],[R2,D],[D,Bt]].forEach(function(s){c.beginPath();c.moveTo(s[0][0],s[0][1]);c.lineTo(s[1][0],s[1][1]);c.stroke();});
    poly(c,[T,R1,R2,Bt,L2,L1]);c.lineWidth=2.6;c.strokeStyle=ORO_B;c.stroke();c.lineWidth=1.1;c.strokeStyle=FILO;c.stroke();
    // chispa que recorre la arista
    var ph=(t*.45)%1;if(ph<.3){var k=ph/.3,sx=-12+k*6,sy=-14-k*22;c.fillStyle='rgba(255,255,255,'+(1-Math.abs(k-.5)*2)+')';
      c.beginPath();c.moveTo(sx,sy-5);c.lineTo(sx+1,sy-1);c.lineTo(sx+5,sy);c.lineTo(sx+1,sy+1);c.lineTo(sx,sy+5);c.lineTo(sx-1,sy+1);c.lineTo(sx-5,sy);c.lineTo(sx-1,sy-1);c.closePath();c.fill();}
    c.restore();
  }

  /* ---------- el armado: cada pieza llega a su sitio a su tiempo ---------- */
  var ARM=99; // segundos desde que empezó a armarse el emblema que se pinta
  var FIN=[1.0,1.25,1.55,1.95,2.1,2.5]; // cuándo encaja la última pieza de cada rango
  function ease(p){var q=p-1;return 1+2.4*q*q*q+1.4*q*q;}
  function pz(c,d,tipo,fn,cx,cy){
    var p=(ARM-d)/.45;if(p<=0)return;
    if(p>=1){fn();
      var b=(ARM-d-.45)/.4; // el chispazo al encajar
      if(b<1&&(tipo==='pop'||tipo==='cae')){c.save();c.globalAlpha*=1-b;c.strokeStyle=tipo==='pop'?'#ffffff':'#fff0b8';c.lineWidth=2.5*(1-b);
        var X=cx||0,Y=cy||0,R=(tipo==='pop'?8:14)+b*(tipo==='pop'?30:26);c.beginPath();if(tipo==='pop')c.arc(X,Y,R,0,7);else c.ellipse(X,Y,R*1.6,R*.3,0,0,7);c.stroke();
        if(tipo==='pop'){for(var k=0;k<8;k++){var a=k*Math.PI/4;c.beginPath();c.moveTo(X+Math.cos(a)*R*.7,Y+Math.sin(a)*R*.7);c.lineTo(X+Math.cos(a)*R*1.25,Y+Math.sin(a)*R*1.25);c.stroke();}}
        c.restore();}
      return;}
    var e=ease(p),X=cx||0,Y=cy||0;
    c.save();c.globalAlpha*=Math.min(1,p*2.2);
    if(tipo==='cae')c.translate(0,-80*(1-e));
    else if(tipo==='sube')c.translate(0,60*(1-e));
    else if(tipo==='lado'){c.translate(70*(1-e),-18*(1-e));c.translate(X,Y);c.rotate(.5*(1-e));c.translate(-X,-Y);}
    else{var s=Math.max(.001,tipo==='pop'?e:(.4+.6*e));c.translate(X,Y);c.scale(s,s);c.translate(-X,-Y);}
    fn();c.restore();
  }
  function alas(c,d,x0,y0,L,h,sube,n){
    c.save();pz(c,d,'lado',function(){ala(c,x0,y0,L,h,sube,n);},x0,y0);
    c.scale(-1,1);pz(c,d,'lado',function(){ala(c,x0,y0,L,h,sube,n);},x0,y0);c.restore();
  }

  var SIL=[
    /* I · APRENDIZ: el pilar con dos alas cortas */
    function(c,g,t,resp){
      alas(c,.45,12,4,24,18,12,1);
      pz(c,0,'cae',function(){pilar(c,14,-6,58,8,0);},0,58);
    },
    /* II · CAZADOR: el pilar grabado, alas de dos filetes y una gema pequeña */
    function(c,g,t,resp){
      alas(c,.45,14,-6,40,24,24,2);
      pz(c,0,'cae',function(){pilar(c,17,-22,64,9,1);},0,64);
      pz(c,.8,'pop',function(){joya(c,0,20,6,g,'rombo',resp);},0,20);
    },
    /* III · EXPERTO: alas grandes con su arco y la primera gema */
    function(c,g,t,resp){
      pz(c,.75,'crece',function(){arcos(c,6,50,1);},0,6);
      alas(c,.45,16,-18,50,28,32,3);
      pz(c,0,'cae',function(){pilar(c,19,-34,68,10,2);},0,68);
      pz(c,1.1,'pop',function(){joya(c,0,26,9,g,'rombo',resp);},0,26);
    },
    /* IV · MAESTRO: aparece el escudo con cuernos */
    function(c,g,t,resp){
      pz(c,.75,'crece',function(){arcos(c,8,54,1);},0,8);
      alas(c,.45,24,-26,52,30,34,3);
      pz(c,0,'cae',function(){escudo(c,34,-40,68,12);},0,68);
      pz(c,.25,'sube',function(){pilar(c,13,-24,74,8,1);});
      pz(c,1.1,'cae',function(){estandarte(c,-60,g,26);},0,-60);
      pz(c,1.5,'pop',function(){joya(c,0,6,14,g,'rombo',resp);},0,6);
    },
    /* V · LEYENDA: el arco se cierra en anillo, segundas alas hacia abajo y escudo incrustado */
    function(c,g,t,resp){
      pz(c,.7,'crece',function(){anillo(c,4,64);},0,4);
      alas(c,.95,26,18,46,22,-28,2);
      alas(c,.45,28,-32,58,34,40,4);
      pz(c,0,'cae',function(){escudo(c,40,-46,72,16);},0,72);
      pz(c,.35,'crece',function(){incrusta(c,30,-34,60);},0,10);
      pz(c,.25,'sube',function(){pilar(c,14,-28,80,8,1);});
      pz(c,1.25,'cae',function(){estandarte(c,-68,g,30);},0,-68);
      pz(c,1.65,'pop',function(){joya(c,0,4,17,g,'hex',resp);},0,4);
    },
    /* VI · TOP MUNDIAL: el sol, la gema tallada de la cima, tres pisos de alas, el cristal y la placa */
    function(c,g,t,resp){
      var enc=Math.max(0,Math.min(1,(ARM-2)/.5));
      var h=c.createRadialGradient(0,0,10,0,0,115);h.addColorStop(0,rgba(g,(.26+.1*resp)*enc));h.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=h;c.fillRect(-110,-130,220,260);
      pz(c,1.9,'crece',function(){sol(c,-4,t);},0,-4);
      pz(c,.7,'crece',function(){anillo(c,2,70);},0,2);
      alas(c,1.0,30,22,54,26,-36,3);
      alas(c,.45,30,-40,66,40,48,4);
      pz(c,0,'cae',function(){escudo(c,46,-54,76,20);},0,76);
      pz(c,.35,'crece',function(){incrusta(c,36,-42,64);},0,10);
      espejo(c,function(){pz(c,.6,'lado',function(){oro(c,function(){c.moveTo(20,-40);c.lineTo(30,-32);c.lineTo(28,50);c.lineTo(18,58);c.closePath();},-40,58);},24,-40);});
      pz(c,.25,'sube',function(){pilar(c,15,-34,86,9,1);});
      pz(c,1.25,'cae',function(){gemaCima(c,-82,g,resp,t);},0,-50);
      pz(c,1.45,'sube',function(){
      // la placa: Pac-Man en su hueco
      c.save();c.translate(0,36);
      oro(c,function(){c.moveTo(-22,-9);c.lineTo(22,-9);c.lineTo(26,0);c.lineTo(22,9);c.lineTo(-22,9);c.lineTo(-26,0);c.closePath();},-9,9);
      azul(c,function(){c.moveTo(-17,-5);c.lineTo(17,-5);c.lineTo(20,0);c.lineTo(17,5);c.lineTo(-17,5);c.lineTo(-20,0);c.closePath();});
      c.fillStyle='#ffe23a';c.beginPath();c.moveTo(0,0);c.arc(0,0,4,.6,Math.PI*2-.6);c.closePath();c.fill();
      c.fillStyle='#ffe23a';c.fillRect(8,-1,2,2);c.fillRect(13,-1,2,2);c.fillRect(-12,-1,2,2);
      c.restore();});
      pz(c,2,'pop',function(){joya(c,0,-6,16,g,'cristal',resp);},0,-6);
      // destellos que orbitan cuando ya está completo
      if(enc>0){for(var s=0;s<5;s++){var a=t*.5+s*Math.PI*2/5,x=Math.cos(a)*96,y=-4+Math.sin(a)*70,tw=.5+.5*Math.sin(t*3+s*1.7),L=3+4*tw;
        c.save();c.globalAlpha*=enc*(.35+.65*tw);c.fillStyle='#fff6c8';c.shadowColor=g;c.shadowBlur=8;
        c.beginPath();c.moveTo(x,y-L);c.lineTo(x+1.2,y-1.2);c.lineTo(x+L,y);c.lineTo(x+1.2,y+1.2);c.lineTo(x,y+L);c.lineTo(x-1.2,y+1.2);c.lineTo(x-L,y);c.lineTo(x-1.2,y-1.2);c.closePath();c.fill();c.restore();}}
    }
  ];

  /* el emblema, en un lienzo lógico de 200x240, centro (100,122) */
  function emblema(c,i,t,arm){
    var g=GEMA[i];ARM=(arm==null||reduce)?99:arm;
    var listo=Math.max(0,Math.min(1,(ARM-FIN[i]+.3)/.4));
    c.save();c.translate(100,128);c.scale(.86,.86);
    var resp=0.5+0.5*Math.sin(t*1.6);
    // sombra en el suelo: crece mientras se arma
    var so=Math.max(0,Math.min(1,ARM/.5));
    c.fillStyle='rgba(0,0,0,'+(.5*so)+')';c.beginPath();c.ellipse(0,98,(40+i*6)*(.5+.5*so),6,0,0,Math.PI*2);c.fill();
    // el sacudón cuando encaja la última pieza
    var k=ARM-FIN[i];if(k>0&&k<.3){var am=(1-k/.3)*2.2;c.translate(Math.sin(k*90)*am,Math.cos(k*70)*am*.6);}
    SIL[i](c,g,t,resp);
    c.restore();
    // destello de metal al quedar completo
    if(k>0&&k<.5){c.save();c.globalCompositeOperation='source-atop';c.fillStyle='rgba(255,246,210,'+(.55*(1-k/.5))+')';c.fillRect(0,0,200,240);c.restore();}
    if(listo<1)return;
    var ciclo=(t*.3+i*.13)%1;
    if(ciclo<.4){var bx=-60+ciclo/.4*320;c.save();c.globalCompositeOperation='source-atop';var sg=c.createLinearGradient(bx-26,0,bx+26,0);sg.addColorStop(0,'rgba(255,255,255,0)');sg.addColorStop(.5,'rgba(255,255,255,.28)');sg.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=sg;if(!c.getTransform){c.restore();return;}var m=c.getTransform();c.setTransform(m.a,0,-.35*m.a,m.d,m.e,m.f);c.fillRect(bx-26,0,52,240);c.restore();}
  }


  S.drawEmblem = function (ctx, rango, t, arm) {
    emblema(ctx, Math.max(0, Math.min(5, rango | 0)), t || 0, arm);
  };

  /* la silueta: el emblema armado, cubierto de metal oscuro */
  var tmp = null;
  S.drawEmblemOff = function (ctx, rango, w, h) {
    if (!document.createElement) return;
    if (!tmp) tmp = document.createElement('canvas');
    if (!tmp.getContext) return;
    if (tmp.width !== w || tmp.height !== h) { tmp.width = w; tmp.height = h; }
    var x = tmp.getContext('2d');
    if (!x) return;
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.clearRect(0, 0, w, h);
    var k = w / 200;
    x.setTransform(k, 0, 0, k, 0, 0);
    emblema(x, Math.max(0, Math.min(5, rango | 0)), 0, 99);
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.globalCompositeOperation = 'source-atop';
    x.fillStyle = 'rgba(22,21,40,.86)';
    x.fillRect(0, 0, w, h);
    x.globalCompositeOperation = 'source-over';
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.drawImage(tmp, 0, 0);
    ctx.restore();
  };
  S.EMBLEM_GEMA = GEMA;
  S.EMBLEM_FIN = FIN;
})();
