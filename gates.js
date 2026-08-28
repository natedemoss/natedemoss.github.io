// A half adder, drawn as a schematic. Click the input pads to toggle them and
// the signals propagate. OR, AND and NOT are enough to add two bits.
(function () {
  var cv = document.getElementById('gates');
  var readout = document.getElementById('gate-readout');
  if (!cv || !cv.getContext) return;
  var ctx = cv.getContext('2d');

  // Everything is laid out in this fixed space and scaled to the canvas, so
  // the schematic keeps its proportions at any width.
  var VW = 600;
  var VH = 180;
  var scale = 1;

  var A = false;
  var B = false;

  var PAD = 13;                             // half-width of an input pad
  var yA = 40;
  var yB = 96;
  var pinX = 42;

  // x is the left edge, y the centre line. Inputs sit at y +/- 9.
  var OR = { x: 150, y: 49, w: 46, h: 38, kind: 'or', name: 'OR' };
  var AND1 = { x: 150, y: 105, w: 46, h: 38, kind: 'and', name: 'AND' };
  var NOT = { x: 240, y: 105, w: 34, h: 30, kind: 'not', name: 'NOT' };
  var AND2 = { x: 330, y: 77, w: 46, h: 38, kind: 'and', name: 'AND' };

  var SUM = { x: 466, y: 77, label: 'SUM' };
  var CARRY = { x: 466, y: 152, label: 'CARRY' };

  function css(name, fallback) {
    var v = getComputedStyle(document.documentElement)
      .getPropertyValue(name).trim();
    return v || fallback;
  }
  var bg, ink, fg, rule, muted;

  function readTheme() {
    bg = css('--bg', '#ffffff');
    ink = css('--link', '#0b3d91');
    fg = css('--fg', '#1a1a1a');
    rule = css('--rule', '#e0e0e0');
    muted = css('--muted', '#666666');
  }
  readTheme();

  function fit() {
    var dpr = window.devicePixelRatio || 1;
    var box = cv.getBoundingClientRect();
    if (!box.width || !box.height) return null;

    scale = box.width / VW;
    var cw = Math.round(box.width * dpr);
    var ch = Math.round(box.height * dpr);
    if (cv.width !== cw || cv.height !== ch) {
      cv.width = cw;                        // resizing also clears the bitmap
      cv.height = ch;
    }
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
    return box;
  }

  // Small labels would become illegible on a phone, so they shrink more
  // slowly than the schematic does.
  function font(size) {
    var s = size / Math.max(scale, 0.55);
    ctx.font = s + 'px ui-monospace, Menlo, Consolas, monospace';
  }

  function line(pts, on) {
    ctx.strokeStyle = on ? ink : rule;
    ctx.lineWidth = on ? 2 : 1.25;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.stroke();
  }

  function dot(x, y, on) {
    ctx.fillStyle = on ? ink : rule;
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  function gatePath(g) {
    var x = g.x, y = g.y, w = g.w, h = g.h;
    ctx.beginPath();
    if (g.kind === 'and') {
      ctx.moveTo(x, y - h / 2);
      ctx.lineTo(x + w / 2, y - h / 2);
      ctx.arc(x + w / 2, y, h / 2, -Math.PI / 2, Math.PI / 2);
      ctx.lineTo(x, y + h / 2);
      ctx.closePath();
    } else if (g.kind === 'or') {
      ctx.moveTo(x, y - h / 2);
      ctx.quadraticCurveTo(x + w * 0.55, y - h / 2, x + w, y);
      ctx.quadraticCurveTo(x + w * 0.55, y + h / 2, x, y + h / 2);
      ctx.quadraticCurveTo(x + w * 0.22, y, x, y - h / 2);
    } else {
      ctx.moveTo(x, y - h / 2);
      ctx.lineTo(x + w - 9, y);
      ctx.lineTo(x, y + h / 2);
      ctx.closePath();
    }
  }

  function gate(g, on) {
    gatePath(g);
    ctx.fillStyle = bg;
    ctx.fill();
    ctx.strokeStyle = on ? ink : fg;
    ctx.lineWidth = on ? 1.8 : 1.25;
    ctx.stroke();

    if (g.kind === 'not') {                 // the inverting bubble
      ctx.beginPath();
      ctx.arc(g.x + g.w - 4.5, g.y, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = bg;
      ctx.fill();
      ctx.stroke();
    }

    ctx.fillStyle = muted;
    font(9.5);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(g.name, g.x + g.w / 2, g.y + g.h / 2 + 6);
  }

  function pad(x, y, label, on) {
    ctx.fillStyle = on ? ink : bg;
    ctx.strokeStyle = on ? ink : rule;
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.rect(x - PAD, y - PAD, PAD * 2, PAD * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = on ? bg : muted;
    font(13);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(on ? '1' : '0', x, y + 0.5);

    ctx.fillStyle = fg;
    font(12);
    ctx.textAlign = 'right';
    ctx.fillText(label, x - PAD - 8, y + 0.5);
  }

  function led(l, on) {
    if (on) {                               // a soft halo so it reads as lit
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = ink;
      ctx.beginPath();
      ctx.arc(l.x, l.y, 17, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.beginPath();
    ctx.arc(l.x, l.y, 10, 0, Math.PI * 2);
    ctx.fillStyle = on ? ink : bg;
    ctx.strokeStyle = on ? ink : rule;
    ctx.lineWidth = 1.25;
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = on ? fg : muted;
    font(11);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(l.label, l.x + 18, l.y + 0.5);
  }

  function draw() {
    var box = fit();
    if (!box) return;

    var or = A || B;
    var and1 = A && B;                      // this is the carry
    var not = !and1;
    var sum = or && not;                    // OR minus the overlap, i.e. XOR

    ctx.clearRect(0, 0, VW, VH);

    // A into the OR, then branching down into the AND
    line([[pinX + PAD, yA], [OR.x + 4, yA]], A);
    line([[110, yA], [110, AND1.y + 9], [AND1.x, AND1.y + 9]], A);
    // B into the AND, then branching up into the OR
    line([[pinX + PAD, yB], [AND1.x, yB]], B);
    line([[124, yB], [124, OR.y + 9], [OR.x + 4, OR.y + 9]], B);

    line([[OR.x + OR.w, OR.y], [310, OR.y], [310, AND2.y - 9],
          [AND2.x, AND2.y - 9]], or);
    line([[AND1.x + AND1.w, AND1.y], [NOT.x, NOT.y]], and1);
    line([[NOT.x + NOT.w, NOT.y], [310, NOT.y], [310, AND2.y + 9],
          [AND2.x, AND2.y + 9]], not);
    line([[214, AND1.y], [214, CARRY.y], [CARRY.x - 14, CARRY.y]], and1);
    line([[AND2.x + AND2.w, AND2.y], [SUM.x - 14, SUM.y]], sum);

    dot(110, yA, A);
    dot(124, yB, B);
    dot(214, AND1.y, and1);

    gate(OR, or);
    gate(AND1, and1);
    gate(NOT, not);
    gate(AND2, sum);

    pad(pinX, yA, 'A', A);
    pad(pinX, yB, 'B', B);
    led(SUM, sum);
    led(CARRY, and1);

    if (readout) {
      readout.textContent = (A ? 1 : 0) + ' + ' + (B ? 1 : 0) + ' = ' +
        (and1 ? 1 : 0) + (sum ? 1 : 0);
    }
  }

  function hit(e) {
    var box = cv.getBoundingClientRect();
    if (!box.width) return;
    var u = ((e.clientX - box.left) / box.width) * VW;
    var v = ((e.clientY - box.top) / box.height) * VH;
    var reach = PAD + 6;
    if (Math.abs(u - pinX) > reach) return;
    if (Math.abs(v - yA) <= reach) A = !A;
    else if (Math.abs(v - yB) <= reach) B = !B;
    else return;
    draw();
  }

  cv.addEventListener('pointerdown', hit);
  window.addEventListener('resize', draw);
  window.matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', function () {
      readTheme();
      draw();
    });

  draw();
})();
