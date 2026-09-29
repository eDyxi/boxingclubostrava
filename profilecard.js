// ProfileCard (React Bits) v cistem JS: holograficky lesk a naklon za kurzorem.
(function () {
  var clamp = function (v, a, b) { return Math.min(Math.max(v, a), b); };
  var adj = function (v, fa, fb, ta, tb) { return ta + (tb - ta) * (v - fa) / (fb - fa); };
  document.querySelectorAll('.pc-card-wrapper').forEach(function (wrap) {
    var card = wrap.querySelector('.pc-card'), cur = { x: 50, y: 50 }, tgt = { x: 50, y: 50 }, raf = 0, over = false;
    function set(x, y) {
      var cx = x - 50, cy = y - 50, s = wrap.style;
      s.setProperty('--pointer-x', x + '%'); s.setProperty('--pointer-y', y + '%');
      s.setProperty('--background-x', adj(x, 0, 100, 35, 65) + '%'); s.setProperty('--background-y', adj(y, 0, 100, 35, 65) + '%');
      s.setProperty('--pointer-from-center', clamp(Math.hypot(cy, cx) / 50, 0, 1));
      s.setProperty('--pointer-from-top', y / 100); s.setProperty('--pointer-from-left', x / 100);
      s.setProperty('--rotate-x', (-(cx / 5)).toFixed(2) + 'deg'); s.setProperty('--rotate-y', (cy / 4).toFixed(2) + 'deg');
    }
    function tick() {
      cur.x += (tgt.x - cur.x) * .14; cur.y += (tgt.y - cur.y) * .14; set(cur.x, cur.y);
      if (Math.abs(tgt.x - cur.x) > .05 || Math.abs(tgt.y - cur.y) > .05) raf = requestAnimationFrame(tick);
      else { raf = 0; if (!over) { wrap.classList.remove('active'); card.classList.remove('active'); } }
    }
    function go() { if (!raf) raf = requestAnimationFrame(tick); }
    card.addEventListener('pointerenter', function () { over = true; wrap.classList.add('active'); card.classList.add('active'); });
    card.addEventListener('pointermove', function (e) {
      var r = card.getBoundingClientRect();
      tgt.x = clamp((e.clientX - r.left) / r.width * 100, 0, 100); tgt.y = clamp((e.clientY - r.top) / r.height * 100, 0, 100); go();
    });
    card.addEventListener('pointerleave', function () { over = false; tgt.x = 50; tgt.y = 50; go(); });
    set(50, 50);
  });
})();
