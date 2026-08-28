// The logistic map, x -> r*x*(1-x). Top panel is the bifurcation diagram,
// bottom panel is the orbit at whatever r the cursor is over. No dependencies.
(function () {
  var bif = document.getElementById('bifurcation');
  var orb = document.getElementById('orbit');
  var readout = document.getElementById('lm-readout');
  if (!bif || !orb || !bif.getContext) return;

  var bctx = bif.getContext('2d');
  var octx = orb.getContext('2d');

  var R_MIN = 2.8;          // just before the first fork, at r = 3
  var R_MAX = 4.0;
  var SETTLE = 400;         // iterations dropped so only the attractor is drawn
  var KEEP = 260;           // iterations plotted per column
  var SERIES = 32;          // points in the time series
  var LADDER = 56;          // cobweb steps per pass

  // Seed for every orbit. Not 0.5: at r = 4 that lands on 1, then on 0, and
  // sticks there, so the most chaotic column would read as a fixed point.
  var SEED = 0.4;

  var r = 3.5;              // period 4, a good opening position

  // The diagram costs ~1M iterations, so it is rendered once into an
  // offscreen canvas and blitted on every hover.
  var cache = document.createElement('canvas');
  var cacheW = 0;
  var cacheH = 0;

  function css(name, fallback) {
    var v = getComputedStyle(document.documentElement)
      .getPropertyValue(name).trim();
    return v || fallback;
  }
  var ink, rule, muted;

  function readTheme() {
    ink = css('--link', '#0b3d91');
    rule = css('--rule', '#e0e0e0');
    muted = css('--muted', '#666666');
  }
  readTheme();

  // ImageData needs channels, and the custom properties are hex.
  function rgb(hex) {
    var s = hex.replace('#', '');
    if (s.length === 3) s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2];
    var n = parseInt(s, 16);
    if (isNaN(n) || s.length !== 6) return [26, 26, 26];
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function fit(canvas, ctx) {
    var dpr = window.devicePixelRatio || 1;
    var box = canvas.getBoundingClientRect();
    if (!box.width || !box.height) return null;

    var cw = Math.round(box.width * dpr);
    var ch = Math.round(box.height * dpr);
    if (canvas.width !== cw || canvas.height !== ch) {
      canvas.width = cw;                      // resizing also clears the bitmap
      canvas.height = ch;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    return box;
  }

  // One column per device pixel. Hits are counted rather than drawn so the
  // chaotic bands keep their density, which is where the structure lives.
  function renderDiagram(pw, ph) {
    cache.width = pw;
    cache.height = ph;

    var counts = new Uint16Array(pw * ph);
    var px, i, x, rr, py;

    for (px = 0; px < pw; px++) {
      rr = R_MIN + (R_MAX - R_MIN) * ((px + 0.5) / pw);
      x = SEED;
      for (i = 0; i < SETTLE; i++) x = rr * x * (1 - x);
      for (i = 0; i < KEEP; i++) {
        x = rr * x * (1 - x);
        py = ph - 1 - ((x * (ph - 1)) | 0);
        if (py >= 0 && py < ph) counts[py * pw + px]++;
      }
    }

    var cctx = cache.getContext('2d');
    var img = cctx.createImageData(pw, ph);
    var d = img.data;
    var col = rgb(css('--fg', '#1a1a1a'));
    for (i = 0; i < counts.length; i++) {
      var c = counts[i];
      if (!c) continue;
      var o = i * 4;
      d[o] = col[0];
      d[o + 1] = col[1];
      d[o + 2] = col[2];
      d[o + 3] = (255 * c) / (c + 2);         // saturates fast, never fully flat
    }
    cctx.putImageData(img, 0, 0);
    cacheW = pw;
    cacheH = ph;
  }

  function drawDiagram() {
    var box = fit(bif, bctx);
    if (!box) return;

    var dpr = window.devicePixelRatio || 1;
    var pw = Math.round(box.width * dpr);
    var ph = Math.round(box.height * dpr);
    if (pw !== cacheW || ph !== cacheH) renderDiagram(pw, ph);

    bctx.clearRect(0, 0, box.width, box.height);
    bctx.drawImage(cache, 0, 0, box.width, box.height);

    var mx = ((r - R_MIN) / (R_MAX - R_MIN)) * box.width;
    bctx.strokeStyle = ink;
    bctx.lineWidth = 1;
    bctx.beginPath();
    bctx.moveTo(Math.round(mx) + 0.5, 0);
    bctx.lineTo(Math.round(mx) + 0.5, box.height);
    bctx.stroke();
  }

  // Smallest p with f^p(x) == x once the transient is gone. 0 means the orbit
  // never closed, which at this tolerance means chaos.
  function period(rr) {
    var x = SEED, i;
    for (i = 0; i < 5000; i++) x = rr * x * (1 - x);
    var x0 = x;
    for (i = 1; i <= 16; i++) {
      x = rr * x * (1 - x);
      if (Math.abs(x - x0) < 1e-6) return i;
    }
    return 0;
  }

  function drawOrbit() {
    var box = fit(orb, octx);
    if (!box) return;

    var w = box.width;
    var h = box.height;
    octx.clearRect(0, 0, w, h);

    var pad = 3;
    var side = h - pad * 2;                   // the cobweb is square
    var gap = 20;
    var sx = side + gap;                      // time series starts here
    var sw = w - sx - pad;

    // --- cobweb: the parabola, the diagonal, and the iteration between them
    var X = function (u) { return pad + u * side; };
    var Y = function (v) { return h - pad - v * side; };

    octx.strokeStyle = rule;
    octx.lineWidth = 1;
    octx.strokeRect(pad + 0.5, pad + 0.5, side - 1, side - 1);

    octx.beginPath();
    octx.moveTo(X(0), Y(0));
    octx.lineTo(X(1), Y(1));
    octx.stroke();

    octx.strokeStyle = muted;
    octx.beginPath();
    for (var i = 0; i <= 96; i++) {
      var u = i / 96;
      var v = r * u * (1 - u);
      if (i === 0) octx.moveTo(X(u), Y(v));
      else octx.lineTo(X(u), Y(v));
    }
    octx.stroke();

    octx.strokeStyle = ink;

    function ladder(x, steps) {
      octx.beginPath();
      octx.moveTo(X(x), Y(x));
      for (var j = 0; j < steps; j++) {
        var fx = r * x * (1 - x);
        octx.lineTo(X(x), Y(fx));             // up to the curve
        octx.lineTo(X(fx), Y(fx));            // across to the diagonal
        x = fx;
      }
      octx.stroke();
      return x;
    }

    octx.globalAlpha = 0.3;                   // the transient, on its way in
    var x = ladder(SEED, LADDER);
    octx.globalAlpha = 1;
    for (i = 0; i < 400; i++) x = r * x * (1 - x);
    ladder(x, LADDER);                        // the attractor itself

    // --- time series: the same orbit against iteration count
    if (sw > 40) {
      octx.strokeStyle = rule;
      octx.beginPath();
      octx.moveTo(sx, h - pad + 0.5);
      octx.lineTo(sx + sw, h - pad + 0.5);
      octx.stroke();

      var step = sw / (SERIES - 1);
      var xs = new Array(SERIES);
      var ys = new Array(SERIES);
      for (i = 0; i < SERIES; i++) {
        x = r * x * (1 - x);
        xs[i] = sx + i * step;
        ys[i] = h - pad - x * side;
      }

      octx.strokeStyle = ink;
      octx.globalAlpha = 0.55;
      octx.beginPath();
      octx.moveTo(xs[0], ys[0]);
      for (i = 1; i < SERIES; i++) octx.lineTo(xs[i], ys[i]);
      octx.stroke();

      octx.globalAlpha = 1;
      octx.fillStyle = ink;
      for (i = 0; i < SERIES; i++) octx.fillRect(xs[i] - 1.5, ys[i] - 1.5, 3, 3);
    }
  }

  function label() {
    if (!readout) return;
    var p = period(r);
    readout.textContent = 'r = ' + r.toFixed(4) + ' · ' +
      (p ? 'period ' + p : 'chaotic');
  }

  function render() {
    drawDiagram();
    drawOrbit();
    label();
  }

  function pick(e) {
    var box = bif.getBoundingClientRect();
    if (!box.width) return;
    var t = (e.clientX - box.left) / box.width;
    r = R_MIN + (R_MAX - R_MIN) * Math.max(0, Math.min(1, t));
    render();
  }

  bif.addEventListener('pointermove', pick);
  bif.addEventListener('pointerdown', pick);
  window.addEventListener('resize', render);
  window.matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', function () {
      readTheme();
      cacheW = 0;                             // --fg changed, so redraw the ink
      render();
    });

  render();
})();
