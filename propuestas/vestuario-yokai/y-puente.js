  /* ---- de la forma del juego a la de la vitrina ----
   * Accesorios, efectos y emotes van escritos como los quiere el JUEGO
   * (ACC.id, EFX.id, caraYokai) y la vitrina pinta por DRAW.id. Se enchufan
   * aquí, así el día que entren al juego no hay que tocarlos. */
  Object.keys(ACC).forEach(function (id) {
    var dib = ACC[id];
    DRAW[id] = function (ctx, o) {
      body(ctx, o);
      ctx.save(); frame(ctx, o.x, o.y, o.d); dib(ctx, o); ctx.restore();
    };
  });
  Object.keys(EFX).forEach(function (id) {
    var dib = EFX[id];
    DRAW[id] = function (ctx, o) { dib(ctx, o, function () { body(ctx, o); }); };
  });
  ['kawaii', 'banzai', 'itadakimasu', 'zen', 'ninja'].forEach(function (id) {
    DRAW['emo_' + id] = function (ctx, o) {
      body(ctx, o);
      globoEmote(ctx, o.x, o.y - 11, o.c, o.t * 60, function (cx, cy, r) {
        caraYokai(ctx, cx, cy, r, o.c, id, o.t * 60);
      });
    };
  });
