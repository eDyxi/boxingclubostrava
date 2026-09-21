// Pismena hlavnich nadpisu uhybaji kurzoru. Sdileno vsemi strankami.
// Posun jde pres vlastnost `translate`, ne `transform` - ten si drzi GSAP a CSS
// animace pro najezd a odlesk, a `translate` se s nim sklada, misto aby ho prepsal.
(function () {
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // Rozklad na slova a pismena. Deli se jen podle beznych mezer - pevna mezera
  // (&nbsp;) zustane uvnitr slova, takze treba "v 16:30" se nerozdeli na dva radky.
  function split(el) {
    if (el.querySelector('.sh')) return;
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (x) {
        if (x.nodeType === 3) {
          if (!x.nodeValue.trim()) return;
          var f = document.createDocumentFragment();
          x.nodeValue.split(/([ \t\n\r]+)/).forEach(function (tok) {
            if (!tok) return;
            if (/^[ \t\n\r]+$/.test(tok)) { f.appendChild(document.createTextNode(tok)); return; }
            var w = document.createElement('span'); w.className = 'wd';
            tok.split('').forEach(function (c) {
              var sp = document.createElement('span'); sp.className = 'ch';
              var it = document.createElement('i'); it.className = 'sh'; it.textContent = c;
              sp.appendChild(it); w.appendChild(sp);
            });
            f.appendChild(w);
          });
          node.replaceChild(f, x);
        } else if (x.nodeType === 1 && x.tagName !== 'BR') walk(x);
      });
    })(el);
  }

  function attach(host, getItems, R, F) {
    var L = [], st = [], mx = -9999, my = -9999, raf = 0, active = false;
    function measure() {
      L = getItems();
      if (st.length !== L.length) st = L.map(function () { return { x: 0, y: 0, cx: 0, cy: 0 }; });
      for (var k = 0; k < L.length; k++) {
        var r = L[k].getBoundingClientRect();
        st[k].cx = r.left + r.width / 2 - st[k].x;
        st[k].cy = r.top + r.height / 2 - st[k].y;
      }
    }
    function tick() {
      var moving = false;
      for (var k = 0; k < L.length; k++) {
        var s = st[k], tx = 0, ty = 0;
        if (active) {
          var dx = s.cx - mx, dy = s.cy - my, d = Math.sqrt(dx * dx + dy * dy);
          if (d < R) { var f = 1 - d / R; f *= f; tx = dx / (d || 1) * F * f; ty = dy / (d || 1) * F * f; }
        }
        s.x += (tx - s.x) * .16; s.y += (ty - s.y) * .16;
        L[k].style.translate = s.x.toFixed(1) + 'px ' + s.y.toFixed(1) + 'px';
        if (Math.abs(s.x) > .08 || Math.abs(s.y) > .08) moving = true;
      }
      if (active || moving) raf = requestAnimationFrame(tick);
      else { raf = 0; host.classList.remove('rep'); }
    }
    host.addEventListener('mouseenter', function () {
      measure(); active = true; host.classList.add('rep');
      if (!raf) raf = requestAnimationFrame(tick);
    });
    host.addEventListener('mousemove', function (e) { mx = e.clientX; my = e.clientY; }, { passive: true });
    host.addEventListener('mouseleave', function () {
      active = false; if (!raf) raf = requestAnimationFrame(tick);
    });
    addEventListener('scroll', function () { if (active) measure(); }, { passive: true });
  }

  function init() {
    // Hlavni nadpis na uvodu ma plnou silu - ten je presne takhle dobre.
    // Vsechny ostatni nadpisy jen jemne, s mensim dosahem.
    document.querySelectorAll('.p h1, .p h2, .rozc-head h2, .outro h2, .intro h1').forEach(function (h) {
      split(h);
      var main = h.matches('#p0 h1');
      attach(h, function () { return [].slice.call(h.querySelectorAll('.sh')); },
             main ? 128 : 75, main ? 36 : 12);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
