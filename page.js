// Bile svetlo sleduje kurzor. Na dotykovych zarizenich se nezapina.
(function () {
  var t = document.querySelector('.torch');
  if (!t || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  var x = innerWidth / 2, y = innerHeight / 2, cx = x, cy = y;
  addEventListener('pointermove', function (e) {
    x = e.clientX; y = e.clientY; document.body.classList.add('lit');
  }, { passive: true });
  addEventListener('pointerleave', function () { document.body.classList.remove('lit'); });
  (function frame() {
    cx += (x - cx) * .14; cy += (y - cy) * .14;
    t.style.transform = 'translate3d(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px,0)';
    requestAnimationFrame(frame);
  })();
})();
