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
  var last = 0, live = 0;
  addEventListener('pointermove', function (e) {
    x = e.clientX; y = e.clientY; document.body.classList.add('lit');
    // stopa jako na hladine: kruh kazdych 45 ms, nejvys sestnact najednou
    var now = performance.now();
    if (now - last < 45 || live > 16) return; last = now;
    var d = document.createElement('i'); d.className = 'rip';
    d.style.left = x + 'px'; d.style.top = y + 'px';
    document.body.appendChild(d); live++;
    d.addEventListener('animationend', function () { d.remove(); live--; });
  }, { passive: true });
  addEventListener('pointerleave', function () { document.body.classList.remove('lit'); });
  (function frame() {
    cx += (x - cx) * .14; cy += (y - cy) * .14;
    t.style.transform = 'translate3d(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px,0)';
    requestAnimationFrame(frame);
  })();
})();
