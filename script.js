// Understanding AI: small enhancements. The site is fully readable without this file.

// 1. A sphere of 0s and 1s, centred behind the page.
//    - The sphere turns all the time, and every digit also spins around itself.
//    - While you scroll, the digits scatter in random directions and leave the page.
//      At the very bottom of the page none are left.
(function () {
  var canvas = document.getElementById('binary-sphere');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function rand(seed) {                      // small repeatable "random" number between 0 and 1
    var x = Math.sin(seed * 12.9898) * 43758.5453;
    return x - Math.floor(x);
  }

  // Spread 340 digits evenly over a sphere (Fibonacci sphere) and give each its own random traits.
  var COUNT = 340, golden = Math.PI * (3 - Math.sqrt(5)), points = [];
  for (var i = 0; i < COUNT; i++) {
    var y = 1 - (i / (COUNT - 1)) * 2;
    var ring = Math.sqrt(1 - y * y);
    var theta = golden * i;
    points.push({
      x: Math.cos(theta) * ring,
      y: y,
      z: Math.sin(theta) * ring,
      digit: rand(i + 1) > 0.5 ? '1' : '0',
      spinPhase: rand(i + 2) * Math.PI * 2,                                 // where its own spin starts
      spinSpeed: (0.5 + rand(i + 3) * 0.7) * (rand(i + 4) > 0.5 ? 1 : -1) * 0.0011,  // radians per ms
      turn: (rand(i + 5) - 0.5) * 1.8,                                      // random change of direction when scattering
      reach: 1.8 + rand(i + 6) * 0.7,                                       // how far it travels
      start: rand(i + 7) * 0.4,                                             // when it starts to leave (0 = top of page)
      wobble: (rand(i + 8) - 0.5) * 0.35,
      wobbleRate: 2 + rand(i + 9) * 4
    });
  }

  var tilt = 0.4, cosT = Math.cos(tilt), sinT = Math.sin(tilt);
  var w = 0, h = 0, R = 0, half = 0;
  var target = 0, shown = 0, lastTime = 0;
  // On every page load the digits start scattered and then drift together into the sphere.
  var INTRO_DELAY = 250, INTRO_TIME = 2600;     // milliseconds
  var intro = reduceMotion ? 0 : 1, introStart = null;

  function readScroll() {
    var max = document.documentElement.scrollHeight - window.innerHeight;
    target = max > 4 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
  }

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    R = Math.min(w, h) * 0.44;
    half = Math.sqrt(w * w + h * h) / 2;     // distance from the centre to a corner
    readScroll();
    if (reduceMotion) { shown = target; draw(0); }
  }

  function draw(time) {
    ctx.clearRect(0, 0, w, h);
    var sc = Math.max(intro, shown);         // 1 = fully scattered, 0 = a complete sphere
    if (sc > 0.985) return;                  // scattered away (page bottom, or start of the intro): nothing to draw

    var angle = time * 0.00022;              // about one full turn every 28 seconds
    var cosA = Math.cos(angle), sinA = Math.sin(angle);
    var cx = w / 2, cy = h / 2, focal = R * 3;

    for (var i = 0; i < points.length; i++) {
      var p = points[i];
      var x1 = p.x * cosA + p.z * sinA;      // sphere spins around the vertical axis
      var z1 = -p.x * sinA + p.z * cosA;
      var y2 = p.y * cosT - z1 * sinT;       // tipped slightly toward the viewer
      var z2 = p.y * sinT + z1 * cosT;

      var scale = focal / (focal - z2 * R);
      var depth = (z2 + 1) / 2;              // 0 = far side, 1 = near side
      var px = cx + x1 * R * scale;
      var py = cy + y2 * R * scale;

      // Scatter: each digit leaves outward, turned by its own random amount, one by one.
      var q = (sc - p.start) / (0.95 - p.start);
      q = q < 0 ? 0 : (q > 1 ? 1 : q);
      var alpha = 0.07 + 0.43 * depth * depth;
      var size = R * 0.075 * scale;
      if (q > 0) {
        var dx = px - cx, dy = py - cy;
        var len = Math.sqrt(dx * dx + dy * dy) || 1;
        var ux = dx / len, uy = dy / len;
        var c = Math.cos(p.turn), s = Math.sin(p.turn);
        var vx = ux * c - uy * s, vy = ux * s + uy * c;
        var eased = q * q * (3 - 2 * q);
        var sideways = Math.sin(q * p.wobbleRate + i) * p.wobble * half * eased;
        px += vx * p.reach * half * eased - vy * sideways;
        py += vy * p.reach * half * eased + vx * sideways;
        size *= 1 + eased * 0.8;
        alpha *= 1 - eased * eased * eased;  // fades as it leaves, so nothing stays behind
      }
      if (alpha < 0.004) continue;

      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(p.spinPhase + time * p.spinSpeed);   // each digit spins 360 degrees around itself
      ctx.font = '700 ' + size.toFixed(1) + 'px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
      ctx.fillStyle = 'rgba(67, 56, 255, ' + alpha.toFixed(3) + ')';
      ctx.fillText(p.digit, 0, 0);
      ctx.restore();
    }
  }

  function frame(time) {
    var dt = lastTime ? Math.min(time - lastTime, 100) : 16;
    lastTime = time;
    shown += (target - shown) * (1 - Math.exp(-dt / 140));   // glide toward the scroll position (works both ways)
    if (introStart === null) introStart = time;
    var ip = Math.min(1, Math.max(0, (time - introStart - INTRO_DELAY) / INTRO_TIME));
    intro = 1 - ip * ip * (3 - 2 * ip);                      // smooth: slow start, slow finish
    draw(time);
    window.requestAnimationFrame(frame);
  }

  window.addEventListener('scroll', function () {
    readScroll();
    if (reduceMotion) { shown = target; draw(0); }
  }, { passive: true });
  window.addEventListener('resize', resize);
  // Coming back with the browser's Back button: gather the sphere again.
  window.addEventListener('pageshow', function (e) {
    if (e.persisted && !reduceMotion) { introStart = null; intro = 1; }
  });
  resize();
  shown = target;
  if (!reduceMotion) window.requestAnimationFrame(frame);   // people who ask for less motion get a still sphere
})();

// 2. Keep sticky layouts in step with the real header height.
(function () {
  var header = document.querySelector('.site-header');
  function setHeaderHeight() {
    if (header) document.documentElement.style.setProperty('--header-h', header.offsetHeight + 'px');
  }
  setHeaderHeight();
  window.addEventListener('resize', setHeaderHeight);
})();

// 3. The protein chain folds up when it scrolls into view.
(function () {
  var svg = document.querySelector('.fold');
  if (!svg) return;
  var line = svg.querySelector('polyline');
  var dots = svg.querySelectorAll('circle');
  var n = dots.length;
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function folded(i) {
    var a = (i / (n - 1)) * 2 * Math.PI * 1.05;
    return {
      x: 280 + 105 * Math.cos(a) + 42 * Math.cos(3 * a + 0.8),
      y: 130 + 62 * Math.sin(a) + 26 * Math.sin(2 * a + 0.5),
      d: Math.sin(a * 1.5 + 0.7)
    };
  }
  function render(t) {
    var pts = [];
    for (var i = 0; i < n; i++) {
      var f = folded(i);
      var ox = 30 + i * (500 / (n - 1));
      var x = ox + (f.x - ox) * t;
      var y = 130 + (f.y - 130) * t;
      var r = 7.5 + 2.5 * f.d * t;
      var o = 1 + ((0.6 + 0.4 * (f.d + 1) / 2) - 1) * t;
      dots[i].setAttribute('cx', x.toFixed(1));
      dots[i].setAttribute('cy', y.toFixed(1));
      dots[i].setAttribute('r', r.toFixed(1));
      dots[i].setAttribute('opacity', o.toFixed(2));
      pts.push(x.toFixed(1) + ',' + y.toFixed(1));
    }
    line.setAttribute('points', pts.join(' '));
  }

  if (reduceMotion || !('IntersectionObserver' in window)) { render(1); return; }
  render(0);                                   // starts as a straight chain
  var played = false;
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting && !played) {
        played = true;
        io.disconnect();
        setTimeout(play, 600);
      }
    });
  }, { threshold: 0.5 });
  io.observe(svg);

  function play() {
    var start = null;
    function step(ts) {
      if (start === null) start = ts;
      var p = Math.min(1, (ts - start) / 2800);
      var e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
      render(e);
      if (p < 1) window.requestAnimationFrame(step);
    }
    window.requestAnimationFrame(step);
  }
})();

// 3b. Numbers count up from zero when they scroll into view.
(function () {
  var els = document.querySelectorAll('.count');
  if (!els.length) return;
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion || !('IntersectionObserver' in window)) return;   // keep the final numbers already in the page
  function show(el, v) { el.textContent = Math.round(v) + el.getAttribute('data-suffix'); }
  els.forEach(function (el) { show(el, 0); });
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      io.unobserve(entry.target);
      var el = entry.target, to = parseFloat(el.getAttribute('data-to')), start = null;
      function step(ts) {
        if (start === null) start = ts;
        var p = Math.min(1, (ts - start) / 1600);
        show(el, to * (1 - Math.pow(1 - p, 3)));
        if (p < 1) window.requestAnimationFrame(step);
      }
      window.requestAnimationFrame(step);
    });
  }, { threshold: 0.8 });
  els.forEach(function (el) { io.observe(el); });
})();

// 4. Reveal content as it scrolls into view.
(function () {
  var items = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)) {
    items.forEach(function (el) { el.classList.add('is-visible'); });
    return;
  }
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  items.forEach(function (el) { observer.observe(el); });
})();

// 5. Tap a highlighted word in the formal definition to see it in plain words.
(function () {
  var marks = document.querySelectorAll('mark.key');
  var out = document.getElementById('decode-out');
  if (!marks.length || !out) return;
  var buttons = [];
  marks.forEach(function (m) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'key-btn';
    b.textContent = m.textContent;
    b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', function () {
      buttons.forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
      b.setAttribute('aria-pressed', 'true');
      out.textContent = '';
      var s = document.createElement('strong');
      s.textContent = m.textContent;
      out.appendChild(s);
      out.appendChild(document.createTextNode(' = ' + m.getAttribute('data-plain')));
      out.classList.add('has-word');
    });
    m.parentNode.replaceChild(b, m);
    b.setAttribute('data-plain', m.getAttribute('data-plain'));
    buttons.push(b);
  });
})();

// 6. The menu bar tucks away after about 3 seconds; the button in the top-right corner brings it back.
(function () {
  var header = document.getElementById('site-header');
  var btn = document.getElementById('menu-toggle');
  if (!header || !btn) return;
  var DELAY = 3000, timer = null, lastMove = 0;
  header.addEventListener('pointermove', function () { lastMove = Date.now(); });
  btn.hidden = false;

  function setOpen(open) {
    header.classList.toggle('is-collapsed', !open);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    window.clearTimeout(timer);
    if (open) timer = window.setTimeout(maybeClose, DELAY);
  }
  function maybeClose() {
    // Stay open while the pointer is moving over the menu or keyboard focus is inside it.
    var pointerBusy = header.matches(':hover') && Date.now() - lastMove < 2500;   // a cursor merely resting there doesn't count
    if (pointerBusy || header.contains(document.activeElement)) {
      timer = window.setTimeout(maybeClose, 1500);
    } else {
      setOpen(false);
    }
  }
  btn.addEventListener('click', function () {
    setOpen(header.classList.contains('is-collapsed'));
  });
  header.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { setOpen(false); btn.focus(); }
  });
  setOpen(true);
})();
