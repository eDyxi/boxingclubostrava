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
  var tiltX = 0, tiltY = 0;

  root.classList.add('cf-on');

  // pridat odlesk a stitek
  cards.forEach(function (c, i) {
    var p = c.querySelector('.cf-panel');
    var g = document.createElement('span'); g.className = 'cf-glare'; p.appendChild(g);
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
        var rx = tiltX, ry = -off * 25 + tiltY;
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
  cards.forEach(function (c, i) {
    c.addEventListener('click', function (e) {
      if (!EXPAND) { if (i !== mid) { e.preventDefault(); go(i); } return; }
      e.preventDefault();
      if (i !== mid) { go(i); return; }
      opened ? closeCard() : openCard(i);
    });
  });

  if (detail) detail.querySelector('.cf-d-close').addEventListener('click', closeCard);
  addEventListener('keydown', function (e) { if (e.key === 'Escape') closeCard(); });

  // ---- naklon za kurzorem + odlesk (jen prostredni karta, jen s mysi) ----
  var HOVER = matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (HOVER) root.addEventListener('mousemove', function (e) {
    var r = root.getBoundingClientRect();
    var nx = Math.max(-1, Math.min(1, (e.clientX - r.left - r.width / 2) / (r.width / 2)));
    var ny = Math.max(-1, Math.min(1, (e.clientY - r.top - r.height / 2) / (r.height / 2)));
    tiltX = -ny * 6; tiltY = nx * 8;
    var m = cards[mid];
    m.style.setProperty('--gx', ((nx + 1) / 2 * 100).toFixed(0) + '%');
    m.style.setProperty('--gy', ((ny + 1) / 2 * 100).toFixed(0) + '%');
    if (!dragging) render();
  }, { passive: true });

  if (HOVER) root.addEventListener('mouseleave', function () { tiltX = tiltY = 0; render(); });

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
