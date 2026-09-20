/* Rozcestnik podstranek - 3D coverflow bez zavislosti.
   Puvodne React komponenta pro trailery; zustala geometrie, tah prstem,
   klavesnice a naklon za kurzorem. Rezim s prehravacem je pryc - karta je odkaz. */
(function () {
  var root = document.getElementById('cf');
  if (!root) return;

  var cards = [].slice.call(root.querySelectorAll('.cf-card'));
  if (cards.length < 2) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;   // zustane mrizka

  var stage = root.querySelector('.cf-stage');
  var glow = root.querySelector('.cf-glow');
  var dotsBox = root.querySelector('.cf-dots');
  var prevBtn = root.querySelector('.cf-prev');
  var nextBtn = root.querySelector('.cf-next');

  // rezim s rozkliknutim - prevzato z puvodni komponenty, jen misto traileru je profil
  var EXPAND = root.dataset.mode === 'expand';
  var detail = root.querySelector('.cf-detail');
  var opened = false;

  // Prvni karta je hlavni cil, takze se startuje na ni. Drive se startovalo
  // uprostred a krajni karty byly od zacatku uplne mimo zaber - nesly kliknout.
  var mid = 0;
  var drag = 0, dragging = false, startX = 0, moved = 0;

  root.classList.add('cf-on');

  // pridat odlesk a stitek
  cards.forEach(function (c, i) {
    var p = c.querySelector('.cf-panel');
    var g = document.createElement('span'); g.className = 'cf-glare'; p.appendChild(g);

    // Tlacitko vedle popisku. Samostatny odkaz, na kterem neni nic, co by klik
    // mohlo zachytit - proto by prekliky mely fungovat vzdycky.
    var meta = c.querySelector('.cf-meta');
    if (meta) {
      var btn;
      if (EXPAND) {
        btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = c.dataset.cta || 'Profil';
        btn.addEventListener('click', function (e) { e.stopPropagation(); openCard(i); });
      } else {
        btn = document.createElement('a');
        btn.setAttribute('href', c.dataset.href || '#');
        btn.textContent = c.dataset.cta || 'Otevřít';
        if ((c.dataset.href || '').indexOf('http') === 0) { btn.target = '_blank'; btn.rel = 'noopener'; }
      }
      btn.className = 'cf-go';

      meta.appendChild(btn);
    }
    var d = document.createElement('i');
    d.addEventListener('click', function () { go(i); });
    dotsBox.appendChild(d);
  });
  var dots = [].slice.call(dotsBox.children);

  function go(i) {
    if (opened) closeCard();
    mid = (i + cards.length) % cards.length;    // dokola, aby byla dosazitelna kazda karta
    render();
  }

  function openCard(i) {
    if (!EXPAND || !detail) return;
    var c = cards[i];
    detail.querySelector('.cf-d-img').style.backgroundImage = c.dataset.img ? 'url(' + c.dataset.img + ')' : 'none';
    detail.querySelector('.cf-d-name').textContent = c.dataset.name || '';
    detail.querySelector('.cf-d-role').textContent = c.dataset.role || '';
    detail.querySelector('.cf-d-bio').textContent = c.dataset.bio || '';
    var mail = detail.querySelector('.cf-d-mail');
    mail.textContent = c.dataset.mail || '';
    mail.href = c.dataset.mail ? 'mailto:' + c.dataset.mail : '#';
    mail.hidden = !c.dataset.mail;
    opened = true;
    root.classList.add('is-open');
  }
  function closeCard() {
    opened = false;
    root.classList.remove('is-open');
  }

  function render() {
    var pull = dragging ? drag / 320 : 0;

    cards.forEach(function (c, i) {
      var off = i - mid - pull;
      var abs = Math.abs(off);
      var sign = off > 0 ? 1 : -1;
      var t, o = 1, f = 'none', z = 10 - Math.round(abs) * 2;

      if (abs < .5) {
        // prostredni karta: mirny naklon za kurzorem, jinak celem k divakovi
        var rx = 0, ry = -off * 25;
        t = 'translateX(' + (off * 80) + 'px) translateZ(0px) rotateY(' + ry + 'deg) rotateX(' + rx + 'deg) scale(' + Math.max(.88, 1 - abs * .15) + ')';
        z = 30;
        f = 'brightness(1.05) drop-shadow(0 25px 45px oklch(6% .02 30/.6))';
      } else if (abs < 1.6) {
        t = 'translateX(' + (sign * 68) + '%) translateZ(-95px) rotateY(' + (sign * -36) + 'deg) scale(.86)';
        o = .88;
        f = 'brightness(.78) drop-shadow(0 15px 30px oklch(6% .02 30/.5))';
      } else if (abs < 2.6) {
        t = 'translateX(' + (sign * 118) + '%) translateZ(-190px) rotateY(' + (sign * -42) + 'deg) scale(.72)';
        o = .5;
        f = 'brightness(.6)';
      } else {
        t = 'translateX(' + (sign * 155) + '%) translateZ(-290px) rotateY(' + (sign * -48) + 'deg) scale(.58)';
        o = 0;
      }

      c.style.transform = t;
      c.style.zIndex = z;
      c.style.opacity = o;
      c.style.filter = f;
      c.style.pointerEvents = o < .1 ? 'none' : 'auto';   // neviditelna karta nesmi chytat kliky
      c.classList.toggle('is-mid', Math.round(off) === 0);
      c.tabIndex = Math.round(off) === 0 ? 0 : -1;
      c.setAttribute('aria-hidden', o === 0 ? 'true' : 'false');
    });

    dots.forEach(function (d, i) { d.classList.toggle('on', i === mid); });
    if (glow) glow.style.background = cards[mid].dataset.glow || 'oklch(45% .17 25/.55)';
  }

  // Tazeni je uplne pryc. Drzeni kurzoru kartami posouvalo a klik se pak
  // vyhodnotil jako swipe, takze odkaz nikdy neprosel. Ovlada se klikem,
  // sipkami, teckami a sipkami na klavesnici.
  // Na prechod se nespolehame na vychozi chovani odkazu - rizeni si bereme sami,
  // aby ho nemohlo nic po ceste spolknout.
  // Na prostredni karte, ktera je obycejny odkaz, nedelame NIC - prechod si
  // vyridi prohlizec sam. Zadny preventDefault, zadne location.assign.
  // Aktivace na pointerdown. V okamziku stisku je prvek pod kurzorem jisty,
  // takze na nasledny pohyb uz nezalezi.
  function hit(t) { return t && t.closest ? t.closest('.cf-go, .cf-card') : null; }

  // Vypis pro ladeni: pridej ?dbg do adresy a v rohu uvidis, co stisk zasahl.
  var dbg = null;
  if (location.search.indexOf('dbg') > -1) {
    dbg = document.createElement('div');
    dbg.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:9999;background:#000c;' +
      'color:#0f0;font:12px monospace;padding:6px 9px;border-radius:6px;pointer-events:none';
    dbg.textContent = 'karusel pripraven, karet: ' + cards.length;
    document.body.appendChild(dbg);
  }
  function log(t) { if (dbg) dbg.textContent = t; }
  // Druha cesta pres click - kdyby pointerdown na nejakem zarizeni nedorazil.
  root.addEventListener('click', function (e) {
    var el = hit(e.target);
    if (!el || el.classList.contains('cf-go')) return;
    var i = cards.indexOf(el);
    if (i >= 0 && i !== mid) go(i);
  });

  root.addEventListener('pointerdown', function (e) {
    if (e.button && e.button !== 0) return;             // jen leve tlacitko
    var el = hit(e.target);
    log('down: ' + (el ? el.className : 'mimo kartu'));
    if (!el) return;
    var card = el.classList.contains('cf-card') ? el : el.closest('.cf-card');
    var i = cards.indexOf(card);
    log('down karta ' + i + ', uprostred ' + mid);
    if (i < 0) return;

    if (el.classList.contains('cf-go')) {
      e.preventDefault();
      if (i !== mid) { go(i); return; }          // z boku nejdriv doprostred
      if (EXPAND) { openCard(i); return; }
      var h = el.getAttribute('href');
      if (!h || h === '#') return;
      if (el.getAttribute('target') === '_blank') window.open(h, '_blank', 'noopener');
      else window.location.href = h;
      return;
    }
    if (i !== mid) { go(i); return; }
    if (EXPAND) { opened ? closeCard() : openCard(i); }
  });

  if (detail) detail.querySelector('.cf-d-close').addEventListener('click', closeCard);
  addEventListener('keydown', function (e) { if (e.key === 'Escape') closeCard(); });

  // Naklon za kurzorem je odstraneny. Kvuli nemu se karta hybala mezi stiskem
  // a pustenim a prohlizec pak klik vubec nevystrelil - na mysi. Na dotyku se
  // nic takoveho nedelo, proto to na mobilu slo a na PC ne.
  // Odlesk se posouva, ale scenu uz neprekresluje.
  // Naklon jde na celou scenu, ne na jednotlive karty. Karty si tim padem
  // nemeni pozici vuci sobe a stisk vzdycky dopadne tam, kam ma.
  var tX = 0, tY = 0, cX = 0, cY = 0, over = false, raf = 0;
  function ease() {
    cX += (tX - cX) * .07; cY += (tY - cY) * .07;
    stage.style.transform = 'rotateX(' + cX.toFixed(2) + 'deg) rotateY(' + cY.toFixed(2) + 'deg)';
    if (over || Math.abs(tX - cX) > .01 || Math.abs(tY - cY) > .01) raf = requestAnimationFrame(ease);
    else raf = 0;
  }
  root.addEventListener('mousemove', function (e) {
    var r = root.getBoundingClientRect();
    var nx = (e.clientX - r.left) / r.width, ny = (e.clientY - r.top) / r.height;
    tY = (nx - .5) * 16;            // z leveho rohu do praveho
    tX = (.5 - ny) * 10;
    over = true;
    var m = cards[mid];
    if (m) {
      m.style.setProperty('--gx', (nx * 100).toFixed(0) + '%');
      m.style.setProperty('--gy', (ny * 100).toFixed(0) + '%');
    }
    if (!raf) raf = requestAnimationFrame(ease);
  }, { passive: true });
  root.addEventListener('mouseleave', function () {
    over = false; tX = 0; tY = 0;
    if (!raf) raf = requestAnimationFrame(ease);
  });

  // ---- klavesnice ----
  root.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') { go(mid - 1); e.preventDefault(); }
    else if (e.key === 'ArrowRight') { go(mid + 1); e.preventDefault(); }
  });
  if (prevBtn) prevBtn.addEventListener('click', function () { go(mid - 1); });
  if (nextBtn) nextBtn.addEventListener('click', function () { go(mid + 1); });

  addEventListener('resize', render, { passive: true });
  render();
})();
