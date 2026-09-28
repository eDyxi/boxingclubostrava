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
    cx = x; cy = y;
    t.style.transform = 'translate3d(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px,0)';
    requestAnimationFrame(frame);
  })();
})();

// Cenove karty: naklon za kurzorem jako karusel (karty nejsou klikaci, takze
// naklon tady nerozbiji klik). Kazda karta dojizdi mekce za cilem.
(function () {
  if (!matchMedia('(hover:hover) and (pointer:fine)').matches) return;
  if (matchMedia('(prefers-reduced-motion:reduce)').matches) return;
  document.querySelectorAll('.price div, .split>.kont .kart, .feed .side .kart').forEach(function (el) {
    var tX = 0, tY = 0, cX = 0, cY = 0, hv = 0, over = false, raf = 0;
    function tick() {
      cX += (tX - cX) * .09; cY += (tY - cY) * .09; hv += ((over ? 1 : 0) - hv) * .08;
      // hover jako u pilulek: posun dopredu a zvetseni o 5 %
      el.style.transform = 'rotateX(' + cX.toFixed(2) + 'deg) rotateY(' +
        cY.toFixed(2) + 'deg) translateZ(' + (4 * hv).toFixed(1) + 'px) scale(' + (1 + .01 * hv).toFixed(4) + ')';
      if (over || Math.abs(tX - cX) > .01 || Math.abs(tY - cY) > .01 || hv > .002) raf = requestAnimationFrame(tick);
      else { raf = 0; el.style.transform = ''; }
    }
    el.addEventListener('mousemove', function (e) {
      var r = el.getBoundingClientRect();
      tY = ((e.clientX - r.left) / r.width - .5) * 7;     // mirny naklon, karty se neprekryvaji
      tX = -((e.clientY - r.top) / r.height - .5) * 6;
      over = true; if (!raf) raf = requestAnimationFrame(tick);
    });
    el.addEventListener('mouseleave', function () { over = false; tX = tY = 0; if (!raf) raf = requestAnimationFrame(tick); });
  });
})();

// vyska hlavicky pro svisle centrovany obsah (kontakt)
(function () {
  var t = document.querySelector('.top'); if (!t || !document.querySelector('.kcenter')) return;
  function set() { document.documentElement.style.setProperty('--toph', Math.ceil(t.getBoundingClientRect().bottom + scrollY) + 'px'); }
  set(); addEventListener('resize', set);
})();

// Telefon s Facebookem: naklon za kurzorem jako karty, ale jen rotace (zadne
// zvetseni ani posun v Z, jinak se text Facebooku rozmaze). Nad iframem stranka
// kurzor nevidi, proto se sleduje dokument - telefon reaguje uz v okoli a na ramu,
// nad displejem drzi posledni naklon. Po odjeti se transformace zrusi (ostry text).
(function () {
  var el = document.querySelector('.feed .box');
  if (!el || !matchMedia('(hover:hover) and (pointer:fine)').matches) return;
  if (matchMedia('(prefers-reduced-motion:reduce)').matches) return;
  var tX = 0, tY = 0, cX = 0, cY = 0, raf = 0;
  function tick() {
    cX += (tX - cX) * .09; cY += (tY - cY) * .09;
    if (Math.abs(tX - cX) > .01 || Math.abs(tY - cY) > .01 || tX || tY) {
      el.style.transform = 'rotateX(' + cX.toFixed(2) + 'deg) rotateY(' + cY.toFixed(2) + 'deg)';
      raf = requestAnimationFrame(tick);
    } else { raf = 0; cX = cY = 0; el.style.transform = ''; }
  }
  document.addEventListener('mousemove', function (e) {
    var r = el.getBoundingClientRect(), m = 60;
    if (e.clientX > r.left - m && e.clientX < r.right + m && e.clientY > r.top - m && e.clientY < r.bottom + m) {
      tY = Math.max(-.5, Math.min(.5, (e.clientX - r.left) / r.width - .5)) * 7;
      tX = -Math.max(-.5, Math.min(.5, (e.clientY - r.top) / r.height - .5)) * 6;
    } else { tX = tY = 0; }
    if (!raf) raf = requestAnimationFrame(tick);
  }, { passive: true });
})();
