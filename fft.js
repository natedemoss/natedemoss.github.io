// Draw a waveform, see its spectrum. Naive DFT, 256 samples, no dependencies.
(function () {
  var wave = document.getElementById('wave');
  var spec = document.getElementById('spectrum');
  var peakLabel = document.getElementById('fft-peak');
  if (!wave || !spec || !wave.getContext) return;

  var wctx = wave.getContext('2d');
  var sctx = spec.getContext('2d');

  var N = 256;              // samples in the waveform
  var BINS = 48;            // frequency bins drawn, DC first
  var samples = new Float32Array(N);
  var mags = new Float32Array(BINS);

  // Twiddle factors, built once. Keeps the transform free of trig so it can
  // run on every pointer move without stuttering.
  var COS = new Float32Array(BINS * N);
  var SIN = new Float32Array(BINS * N);
  for (var k0 = 0; k0 < BINS; k0++) {
    for (var n0 = 0; n0 < N; n0++) {
      var ang0 = (-2 * Math.PI * k0 * n0) / N;
      COS[k0 * N + n0] = Math.cos(ang0);
      SIN[k0 * N + n0] = Math.sin(ang0);
    }
  }

  function css(name, fallback) {
    var v = getComputedStyle(document.documentElement)
      .getPropertyValue(name).trim();
    return v || fallback;
  }
  var ink = css('--link', '#0b3d91');
  var rule = css('--rule', '#e0e0e0');

  // Partial square wave: three odd harmonics, so the spectrum starts with
  // something worth looking at.
  function reset() {
    for (var i = 0; i < N; i++) {
      var x = (i / N) * Math.PI * 2 * 3;
      samples[i] = 0.85 * (Math.sin(x) + Math.sin(3 * x) / 3 + Math.sin(5 * x) / 5);
    }
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

  // Real-input DFT. Only the bins we draw, so this stays cheap enough to run
  // on every pointer move.
  function transform() {
    var peak = 1, best = -1;
    for (var k = 0; k < BINS; k++) {
      var re = 0, im = 0, off = k * N;
      for (var n = 0; n < N; n++) {
        re += samples[n] * COS[off + n];
        im += samples[n] * SIN[off + n];
      }
      mags[k] = (2 * Math.sqrt(re * re + im * im)) / N;
      if (k > 0 && mags[k] > best) {
        best = mags[k];
        peak = k;
      }
    }
    if (peakLabel) peakLabel.textContent = 'k=' + peak;
  }

  function drawWave() {
    var box = fit(wave, wctx);
    if (!box) return;
    var w = box.width, h = box.height, mid = h / 2, amp = h / 2 - 6;

    wctx.clearRect(0, 0, w, h);

    wctx.strokeStyle = rule;                  // zero line
    wctx.lineWidth = 1;
    wctx.beginPath();
    wctx.moveTo(0, mid);
    wctx.lineTo(w, mid);
    wctx.stroke();

    wctx.strokeStyle = ink;
    wctx.lineWidth = 1.6;
    wctx.lineJoin = 'round';
    wctx.beginPath();
    for (var i = 0; i < N; i++) {
      var x = (i / (N - 1)) * w;
      var y = mid - samples[i] * amp;
      if (i === 0) wctx.moveTo(x, y);
      else wctx.lineTo(x, y);
    }
    wctx.stroke();
  }

  function drawSpectrum() {
    var box = fit(spec, sctx);
    if (!box) return;
    var w = box.width, h = box.height;

    sctx.clearRect(0, 0, w, h);

    // Scale to the loudest harmonic, not to DC, so that drawing an offset
    // does not flatten every other bar.
    var max = 0.001;
    for (var k = 1; k < BINS; k++) if (mags[k] > max) max = mags[k];

    var slot = w / BINS;
    var bar = Math.max(1.5, slot - 2);
    sctx.fillStyle = ink;
    for (k = 0; k < BINS; k++) {
      var bh = Math.min(h - 2, (mags[k] / max) * (h - 2));
      sctx.globalAlpha = k === 0 ? 0.35 : 0.85;   // DC bar sits back a little
      sctx.fillRect(k * slot + (slot - bar) / 2, h - bh, bar, bh);
    }
    sctx.globalAlpha = 1;
  }

  function render() {
    drawWave();
    drawSpectrum();
  }

  // Pointer position to sample index, filling in every index we skipped over
  // so fast drags do not leave gaps.
  var drawing = false;
  var lastIndex = -1;

  function write(e) {
    var box = wave.getBoundingClientRect();
    if (!box.width || !box.height) return;
    var amp = box.height / 2 - 6;
    var i = Math.round(((e.clientX - box.left) / box.width) * (N - 1));
    var v = (box.height / 2 - (e.clientY - box.top)) / amp;
    i = Math.min(N - 1, Math.max(0, i));
    v = Math.min(1, Math.max(-1, v));

    if (lastIndex < 0 || lastIndex === i) {
      samples[i] = v;
    } else {
      var from = lastIndex, prev = samples[from];
      var step = i > from ? 1 : -1;
      var span = Math.abs(i - from);
      for (var j = 1; j <= span; j++) {
        samples[from + j * step] = prev + ((v - prev) * j) / span;
      }
    }
    lastIndex = i;
  }

  function start(e) {
    drawing = true;
    lastIndex = -1;
    if (wave.setPointerCapture) wave.setPointerCapture(e.pointerId);
    write(e);
    transform();
    render();
    e.preventDefault();
  }

  function move(e) {
    if (!drawing) return;
    write(e);
    transform();
    render();
    e.preventDefault();
  }

  function end() {
    drawing = false;
    lastIndex = -1;
  }

  wave.addEventListener('pointerdown', start);
  wave.addEventListener('pointermove', move);
  wave.addEventListener('pointerup', end);
  wave.addEventListener('pointercancel', end);
  wave.addEventListener('dblclick', function () {
    reset();
    transform();
    render();
  });

  window.addEventListener('resize', render);
  window.matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', function () {
      ink = css('--link', '#0b3d91');
      rule = css('--rule', '#e0e0e0');
      render();
    });

  reset();
  transform();
  render();
})();
