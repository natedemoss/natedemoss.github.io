// Phosphor-trail Lissajous curve. Cursor position sets the frequency ratio.
(function () {
  var canvas = document.getElementById('scope');
  if (!canvas || !canvas.getContext) return;

  var ctx = canvas.getContext('2d');
  var label = document.getElementById('scope-ratio');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var TRAIL = 900;          // points kept in the phosphor trail
  var STEP = 0.0075;        // radians of curve per point
  var RATE = 4.05;          // radians of curve swept per second
  var EASE = 3;             // how fast the ratio settles, per second
  var DRIFT = 0.13;         // phase drift, radians per second

  var w = 0, h = 0, cx = 0, cy = 0, rx = 0, ry = 0;
  var t = 0;
  var pts = [];

  // Frequency ratio and phase, eased toward the cursor-driven targets.
  var a = 3, b = 2, phase = 0;
  var aT = 3, bT = 2;

  function color() {
    return getComputedStyle(document.documentElement)
      .getPropertyValue('--link').trim() || '#0b3d91';
  }
  var stroke = color();

  function onResize() {
    resize();
    if (reduce) still();
  }

  function resize() {
    var dpr = window.devicePixelRatio || 1;
    var box = canvas.getBoundingClientRect();
    w = box.width;
    h = box.height;
    if (!w || !h) return;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx = w / 2;
    cy = h / 2;
    rx = w / 2 - 8;
    ry = h / 2 - 8;
    stroke = color();
  }

  function point(u) {
    return [cx + rx * Math.sin(a * u + phase), cy + ry * Math.sin(b * u)];
  }

  function draw(flat) {
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (var i = 1; i < pts.length; i++) {
      var age = i / pts.length;               // 0 = oldest, 1 = newest
      ctx.globalAlpha = flat ? 0.75 : 0.06 + 0.84 * age * age;
      ctx.beginPath();
      ctx.moveTo(pts[i - 1][0], pts[i - 1][1]);
      ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.stroke();
    }
    if (pts.length && !flat) {
      var head = pts[pts.length - 1];
      ctx.globalAlpha = 1;
      ctx.fillStyle = stroke;
      ctx.beginPath();
      ctx.arc(head[0], head[1], 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // Time-based so the sweep looks the same at 60 Hz or 144 Hz.
  var last = 0;
  var owed = 0;

  function frame(now) {
    var dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
    last = now;

    if (w && h) {
      var k = Math.min(1, EASE * dt);
      a += (aT - a) * k;
      b += (bT - b) * k;
      phase += DRIFT * dt;

      owed += RATE * dt;
      while (owed >= STEP) {
        pts.push(point(t));
        t += STEP;
        owed -= STEP;
      }
      while (pts.length > TRAIL) pts.shift();
      draw();
    }
    requestAnimationFrame(frame);
  }

  function setRatio(na, nb) {
    if (na === aT && nb === bT) return;
    aT = na;
    bT = nb;
    if (label) label.textContent = aT + ':' + bT;
    if (reduce) still();
  }

  function aim(e) {
    var box = canvas.getBoundingClientRect();
    if (!box.width || !box.height) return;
    var mx = Math.min(1, Math.max(0, (e.clientX - box.left) / box.width));
    var my = Math.min(1, Math.max(0, (e.clientY - box.top) / box.height));
    setRatio(1 + Math.round(mx * 4), 1 + Math.round((1 - my) * 4));
  }

  // Reduced motion: no sweep, no drift. Just the whole figure, redrawn
  // when the cursor asks for a different ratio.
  function still() {
    a = aT;
    b = bT;
    pts = [];
    var n = Math.ceil(2 * Math.PI / STEP);
    for (var i = 0; i <= n; i++) pts.push(point((i / n) * 2 * Math.PI));
    draw(true);
  }

  window.addEventListener('resize', onResize);
  canvas.addEventListener('pointermove', aim);
  canvas.addEventListener('pointerleave', function () { setRatio(3, 2); });
  window.matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', function () {
      stroke = color();
      if (reduce) still();
    });

  resize();

  if (reduce) {
    still();
  } else {
    requestAnimationFrame(frame);
  }
})();
