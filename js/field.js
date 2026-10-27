// Phase portrait of the quadratic system  x' = x^2 + y,  y' = -x - y
// Singular points: a stable focus at (0, 0) and a saddle at (1, -1).
(function () {
  const canvas = document.getElementById('field');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // View window in phase-plane coordinates
  const VIEW = { xmin: -2.3, xmax: 2.7, ymin: -3.0, ymax: 2.0 };
  const field = (x, y) => [x * x + y, -x - y];

  let W = 0, H = 0, dpr = 1;
  let ink = '19,32,48', accent = '43,69,201';
  let particles = [];
  let seeds = [];          // user-dropped particles
  let running = false, visible = true, raf = 0;

  const toPx = (x, y) => [
    (x - VIEW.xmin) / (VIEW.xmax - VIEW.xmin) * W,
    (VIEW.ymax - y) / (VIEW.ymax - VIEW.ymin) * H,
  ];
  const toPlane = (px, py) => [
    VIEW.xmin + px / W * (VIEW.xmax - VIEW.xmin),
    VIEW.ymax - py / H * (VIEW.ymax - VIEW.ymin),
  ];

  function readColors() {
    const cs = getComputedStyle(document.documentElement);
    ink = cs.getPropertyValue('--field-ink').trim() || ink;
    accent = cs.getPropertyValue('--field-accent').trim() || accent;
  }

  function spawn(p) {
    p.x = VIEW.xmin + Math.random() * (VIEW.xmax - VIEW.xmin);
    p.y = VIEW.ymin + Math.random() * (VIEW.ymax - VIEW.ymin);
    p.age = 0;
    p.life = 60 + Math.random() * 140;
    return p;
  }

  // One RK2 step with speed normalised so trails stay even and never blow up
  function step(p, h) {
    const [u1, v1] = field(p.x, p.y);
    const s1 = 1 + Math.hypot(u1, v1);
    const mx = p.x + 0.5 * h * u1 / s1, my = p.y + 0.5 * h * v1 / s1;
    const [u2, v2] = field(mx, my);
    const s2 = 1 + Math.hypot(u2, v2);
    p.x += h * u2 / s2;
    p.y += h * v2 / s2;
  }

  function outOfView(p) {
    return p.x < VIEW.xmin - .2 || p.x > VIEW.xmax + .2 || p.y < VIEW.ymin - .2 || p.y > VIEW.ymax + .2;
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(1, Math.round(rect.width));
    H = Math.max(1, Math.round(rect.height));
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.round(Math.min(1100, W * H / 260));
    particles = Array.from({ length: n }, () => spawn({}));
    ctx.clearRect(0, 0, W, H);
    if (reduce) drawStatic();
  }

  function drawMarkers() {
    const [fx, fy] = toPx(0, 0);
    const [sx, sy] = toPx(1, -1);
    ctx.save();
    ctx.fillStyle = `rgb(${accent})`;
    ctx.beginPath(); ctx.arc(fx, fy, 4.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = `rgb(${accent})`;
    ctx.lineWidth = 1.8;
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--surface');
    ctx.beginPath(); ctx.arc(sx, sy, 4.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.font = '500 12px "IBM Plex Sans", system-ui, sans-serif';
    ctx.fillStyle = `rgba(${ink},.75)`;
    ctx.fillText('focus', fx + 9, fy - 8);
    ctx.fillText('saddle', sx + 9, sy - 8);
    ctx.restore();
  }

  function advance(list, color, alpha, width, h) {
    ctx.strokeStyle = `rgba(${color},${alpha})`;
    ctx.lineWidth = width;
    ctx.beginPath();
    for (const p of list) {
      const [x0, y0] = toPx(p.x, p.y);
      step(p, h);
      p.age++;
      const [x1, y1] = toPx(p.x, p.y);
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
    }
    ctx.stroke();
  }

  function frame() {
    if (!running) return;
    // Fade previous frame towards transparent so the CSS grid stays visible
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'rgba(0,0,0,0.045)';
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';

    advance(particles, ink, 0.6, 1.1, 0.02);
    for (const p of particles) if (p.age > p.life || outOfView(p)) spawn(p);

    if (seeds.length) {
      advance(seeds, accent, 0.9, 1.6, 0.022);
      seeds = seeds.filter(p => p.age < 420 && !outOfView(p));
    }
    drawMarkers();
    raf = requestAnimationFrame(frame);
  }

  // Reduced motion: integrate streamlines once and draw a still image
  function drawStatic() {
    ctx.clearRect(0, 0, W, H);
    ctx.strokeStyle = `rgba(${ink},.35)`;
    ctx.lineWidth = 1;
    const cols = 16, rows = 16;
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      const p = {
        x: VIEW.xmin + (i + .5) / cols * (VIEW.xmax - VIEW.xmin),
        y: VIEW.ymin + (j + .5) / rows * (VIEW.ymax - VIEW.ymin),
      };
      ctx.beginPath();
      let [px, py] = toPx(p.x, p.y);
      ctx.moveTo(px, py);
      for (let k = 0; k < 90; k++) {
        step(p, 0.03);
        if (outOfView(p)) break;
        [px, py] = toPx(p.x, p.y);
        ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
    drawMarkers();
  }

  function start() {
    if (reduce || running || !visible || document.hidden) return;
    running = true;
    raf = requestAnimationFrame(frame);
  }
  function stop() { running = false; cancelAnimationFrame(raf); }

  // Click or tap drops a small cloud of highlighted particles
  canvas.addEventListener('pointerdown', (e) => {
    const r = canvas.getBoundingClientRect();
    const [x, y] = toPlane(e.clientX - r.left, e.clientY - r.top);
    for (let i = 0; i < 24; i++) {
      seeds.push({ x: x + (Math.random() - .5) * .18, y: y + (Math.random() - .5) * .18, age: 0 });
    }
    if (reduce) {
      for (let k = 0; k < 300; k++) advance(seeds, accent, .8, 1.4, 0.03);
      seeds = [];
      drawMarkers();
    }
  });

  readColors();
  resize();
  new ResizeObserver(() => { resize(); }).observe(canvas);
  new IntersectionObserver((entries) => {
    visible = entries[0].isIntersecting;
    visible ? start() : stop();
  }).observe(canvas);
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  window.addEventListener('themechange', () => { readColors(); ctx.clearRect(0, 0, W, H); if (reduce) drawStatic(); });
  start();
})();
