// Rozklad nadpisu na pismena, aby se dal animovat stejne jako na hlavni strance.
// Bez GSAP - vsechno jede pres CSS, kazde pismeno ma svoje poradi v promenne --i.
(function () {
  var h = document.querySelector('.intro h1');
  if (!h) return;
  var n = 0;
  (function walk(node) {
    Array.prototype.slice.call(node.childNodes).forEach(function (x) {
      if (x.nodeType === 3) {
        if (!x.nodeValue.trim()) return;
        var f = document.createDocumentFragment();
        x.nodeValue.split(/(\s+)/).forEach(function (tok) {
          if (!tok) return;
          if (/^\s+$/.test(tok)) { f.appendChild(document.createTextNode(tok)); return; }
          var w = document.createElement('span'); w.className = 'wd';
          tok.split('').forEach(function (c) {
            var sp = document.createElement('span'); sp.className = 'ch';
            var it = document.createElement('i'); it.className = 'sh'; it.textContent = c;
            sp.style.setProperty('--i', n); it.style.setProperty('--i', n); n++;
            sp.appendChild(it); w.appendChild(sp);
          });
          f.appendChild(w);
        });
        node.replaceChild(f, x);
      } else if (x.nodeType === 1 && x.tagName !== 'BR') walk(x);
    });
  })(h);
  document.documentElement.classList.add('js');
})();

// Bile svetlo sleduje kurzor. Na dotykovych zarizenich se nezapina.
(function () {
  var t = document.querySelector('.torch');
  if (!t || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  var x = innerWidth / 2, y = innerHeight / 2, cx = x, cy = y;
  // bubliny za kurzorem, jako proud vody (kruhy na hladine jsou pryc)
  var last = 0, live = 0, px = 0, py = 0;
  var calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  addEventListener('pointermove', function (e) {
    x = e.clientX; y = e.clientY; document.body.classList.add('lit');
    if (calm) return;
    var now = performance.now(), vx = x - px, vy = y - py; px = x; py = y;
    if (now - last < 55 || live > 22) return; last = now;
    var b = document.createElement('i'); b.className = 'bub';
    var sz = 5 + Math.random() * 9;
    b.style.setProperty('--s', sz.toFixed(1) + 'px');
    b.style.setProperty('--t', (1.1 + Math.random() * .9).toFixed(2) + 's');
    b.style.setProperty('--dx', (-vx * .9 + (Math.random() - .5) * 26).toFixed(1) + 'px');
    b.style.setProperty('--dy', (-vy * .9 - 18 - Math.random() * 30).toFixed(1) + 'px');
    b.style.left = (x + (Math.random() - .5) * 10).toFixed(1) + 'px';
    b.style.top = (y + (Math.random() - .5) * 10).toFixed(1) + 'px';
    document.body.appendChild(b); live++;
    b.addEventListener('animationend', function () { b.remove(); live--; });
  }, { passive: true });
  addEventListener('pointerleave', function () { document.body.classList.remove('lit'); });
  (function frame() {
    cx += (x - cx) * .14; cy += (y - cy) * .14;
    t.style.transform = 'translate3d(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px,0)';
    requestAnimationFrame(frame);
  })();
})();
