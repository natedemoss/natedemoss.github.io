// A pinscreen. Every dot is a pin seen end on: the higher it stands, the
// larger it reads and the further it leans away from whatever pushed it.
(function () {
  var cv = document.getElementById('pins');
  if (!cv || !cv.getContext) return;
  var ctx = cv.getContext('2d');

  var SP = 11;                  // pin spacing
  var ROW = SP * 0.87;          // staggered rows, so the field reads as a mesh
  var LIVE_S = 52;              // radius of the bump under the cursor
  var STAMP_S = 40;
  var LEAN = 820;               // how far a pin leans off the slope it sits on
  var MAX_STAMPS = 16;

  var stamps = [];              // impressions left by clicking
  var touched = false;          // until then the field holds a default relief
  var live = null;              // the cursor's own bump
  var pins = [];                // positions plus their resting height
  var W = 0, H = 0;

  function css(name, fallback) {
    var v = getComputedStyle(document.documentElement)
      .getPropertyValue(name).trim();
    return v || fallback;
  }
  function rgb(hex) {
    var s = hex.replace('#', '');
    if (s.length === 3) s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2];
    var n = parseInt(s, 16);
    if (isNaN(n) || s.length !== 6) return [26, 26, 26];
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  var fg, ink, rule;
  function readTheme() {
    fg = rgb(css('--fg', '#1a1a1a'));
    ink = rgb(css('--link', '#0b3d91'));
    rule = css('--rule', '#e0e0e0');
  }
  readTheme();

  // Value noise, for a resting surface that is gently uneven rather than flat.
  function hash(x, y) {
    var h = Math.imul(x, 374761393) + Math.imul(y, 668265263);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  }
  function noise(x, y) {
    var x0 = Math.floor(x), y0 = Math.floor(y);
    var fx = x - x0, fy = y - y0;
    fx = fx * fx * (3 - 2 * fx);
    fy = fy * fy * (3 - 2 * fy);
    var a = hash(x0, y0), b = hash(x0 + 1, y0);
    var c = hash(x0, y0 + 1), d = hash(x0 + 1, y0 + 1);
    return (a + (b - a) * fx) + ((c + (d - c) * fx) - (a + (b - a) * fx)) * fy;
  }

  function build() {
    // Something to look at before the cursor arrives, sized to the canvas.
    if (!touched) {
      stamps = [
        { x: W * 0.27, y: H * 0.44, s: 62, k: 0.5 },
        { x: W * 0.68, y: H * 0.6, s: 48, k: 0.36 }
      ];
    }
    pins.length = 0;
    var rows = Math.ceil(H / ROW) + 1;
    for (var j = 0; j < rows; j++) {
      var y = j * ROW + ROW / 2;
      var offset = (j % 2) * (SP / 2);
      for (var x = offset + SP / 2; x < W + SP; x += SP) {
        pins.push(x, y, noise(x * 0.011, y * 0.011) * 0.34 +
          noise(x * 0.031 + 40, y * 0.031) * 0.14);
      }
    }
  }

  function fit() {
    var dpr = window.devicePixelRatio || 1;
    var box = cv.getBoundingClientRect();
    if (!box.width || !box.height) return false;

    var cw = Math.round(box.width * dpr);
    var ch = Math.round(box.height * dpr);
    if (cv.width !== cw || cv.height !== ch) {
      cv.width = cw;                        // resizing also clears the bitmap
      cv.height = ch;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      W = box.width;
      H = box.height;
      build();
    }
    return true;
  }

  function draw() {
    if (!fit()) return;
    ctx.clearRect(0, 0, W, H);

    var shadows = [];
    for (var i = 0; i < pins.length; i += 3) {
      var x = pins[i], y = pins[i + 1];
      var h = pins[i + 2];
      var hl = 0;                           // the live part, tracked for colour
      var dx = 0, dy = 0;

      // A gaussian bump has gradient -h*(p-c)/s^2, so leaning along the
      // downhill direction is just the offset from the centre, scaled.
      for (var s = 0; s <= stamps.length; s++) {
        var b = s === stamps.length ? live : stamps[s];
        if (!b) continue;
        var ox = x - b.x, oy = y - b.y;
        var d2 = ox * ox + oy * oy;
        var s2 = b.s * b.s;
        if (d2 > s2 * 9) continue;          // far enough out to be nothing
        var g = b.k * Math.exp(-d2 / (2 * s2));
        h += g;
        if (b === live) hl += g;
        dx += (g * ox) / s2;
        dy += (g * oy) / s2;
      }
      if (h > 1) h = 1;
      if (hl > 1) hl = 1;

      var px = x + dx * LEAN;
      var py = y + dy * LEAN;
      var r = 0.9 + h * 3.3;

      if (h > 0.4) shadows.push(px + 1.6, py + 1.8, r * 0.9);

      var c = fg;
      if (hl > 0.02) {                      // warms toward the link colour
        c = [fg[0] + (ink[0] - fg[0]) * hl,
             fg[1] + (ink[1] - fg[1]) * hl,
             fg[2] + (ink[2] - fg[2]) * hl];
      }
      ctx.fillStyle = 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' +
        (c[2] | 0) + ',' + (0.18 + h * 0.78).toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Drawn after, underneath nothing, but they only appear on raised pins
    // and that is enough to make the relief read as relief.
    ctx.fillStyle = rule;
    ctx.globalCompositeOperation = 'destination-over';
    for (i = 0; i < shadows.length; i += 3) {
      ctx.beginPath();
      ctx.arc(shadows[i], shadows[i + 1], shadows[i + 2], 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  var queued = false;
  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(function () { queued = false; draw(); });
  }

  function at(e) {
    var box = cv.getBoundingClientRect();
    return { x: e.clientX - box.left, y: e.clientY - box.top };
  }

  cv.addEventListener('pointermove', function (e) {
    var p = at(e);
    live = { x: p.x, y: p.y, s: LIVE_S, k: 1 };
    schedule();
  });
  cv.addEventListener('pointerleave', function () {
    live = null;
    schedule();
  });
  cv.addEventListener('pointerdown', function (e) {
    var p = at(e);
    if (!touched) { touched = true; stamps.length = 0; }
    live = { x: p.x, y: p.y, s: LIVE_S, k: 1 };
    stamps.push({ x: p.x, y: p.y, s: STAMP_S, k: 0.68 });
    if (stamps.length > MAX_STAMPS) stamps.shift();
    schedule();
  });
  cv.addEventListener('dblclick', function () {
    touched = true;
    stamps.length = 0;
    schedule();
  });

  window.addEventListener('resize', schedule);
  window.matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', function () {
      readTheme();
      draw();
    });

  draw();
})();
