// Menu vpravo nahore na vsech strankach: tri carky -> panel ve tvaru pilulky se vsemi kartami.
(function () {
  var items = [
    ['00', 'Úvod', 'index.html'],
    ['01', 'Trenéři', 'treneri.html'],
    ['02', 'Tréninky', 'treninky.html'],
    ['03', 'Zápasy', ''],
    ['04', 'Galerie', ''],
    ['05', 'Facebook', 'facebook.html'],
    ['06', 'Kontakt', 'kontakt.html']
  ];
  var here = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  var btn = document.createElement('button');
  btn.className = 'mnu-btn'; btn.type = 'button';
  btn.setAttribute('aria-label', 'Menu'); btn.setAttribute('aria-expanded', 'false');
  btn.innerHTML = '<i></i><i></i><i></i>';
  var nav = document.createElement('nav');
  nav.className = 'mnu'; nav.setAttribute('aria-label', 'Hlavní menu');
  var html = '<ul>';
  items.forEach(function (it, i) {
    if (i === 1) html += '<li><hr></li>';
    var cur = it[2] && it[2] === here;
    html += '<li>' + (it[2]
      ? '<a href="' + it[2] + '" style="--i:' + i + '"' + (cur ? ' aria-current="page"' : '') + '><b>' + it[0] + '</b>' + it[1] + (cur ? '<small>tady</small>' : '') + '</a>'
      : '<span class="off" style="--i:' + i + '"><b>' + it[0] + '</b>' + it[1] + '<small>brzy</small></span>') + '</li>';
  });
  nav.innerHTML = html + '</ul>';
  document.body.appendChild(nav); document.body.appendChild(btn);
  function set(o) {
    document.documentElement.classList.toggle('mnu-open', o);
    btn.setAttribute('aria-expanded', o ? 'true' : 'false');
  }
  btn.addEventListener('click', function (e) { e.stopPropagation(); set(!document.documentElement.classList.contains('mnu-open')); });
  document.addEventListener('click', function (e) { if (!nav.contains(e.target)) set(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') set(false); });
})();
