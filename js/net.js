// Interactive neural network behind the hero.
// A feed-forward net: signals enter at the input layer, travel along weighted
// edges and make neurons fire when enough activation arrives. The pointer
// excites nearby neurons; a click or tap fires a full forward pass.
(function () {
  const canvas = document.getElementById('net');
  if (!canvas) return;
  const hero = canvas.parentElement;
  const ctx = canvas.getContext('2d');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let W = 0, H = 0, dpr = 1;
  let ink = '19,32,48', accent = '43,69,201';
  let layers = [], nodes = [], edges = [], pulses = [];
  let pointer = { x: -1e4, y: -1e4, active: false };
  let running = false, visible = true, raf = 0, last = 0, t = 0, nextInput = 0;

  function readColors() {
    const cs = getComputedStyle(document.documentElement);
    ink = cs.getPropertyValue('--field-ink').trim() || ink;
    accent = cs.getPropertyValue('--field-accent').trim() || accent;
  }

  function measureTextRight() {
    const text = hero.querySelector('.hero-text');
    if (!text) return W * 0.4;
    // Measure each text node's line boxes only; element boxes span the full container
    let right = 0;
    const walker = document.createTreeWalker(text, NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    while (walker.nextNode()) {
      if (!walker.currentNode.textContent.trim()) continue;
      range.selectNodeContents(walker.currentNode);
      for (const r of range.getClientRects()) right = Math.max(right, r.right);
    }
    for (const el of text.querySelectorAll('.btn, .icon-link')) right = Math.max(right, el.getBoundingClientRect().right);
    return right - hero.getBoundingClientRect().left;
  }

  function build() {
    const narrow = W < 760;
    const sizes = narrow ? [3, 5, 5, 4, 2] : [4, 7, 9, 9, 6, 3];
    // Desktop: start the network a clear gap after the text block, wherever it ends
    // (measured from the rendered lines, not the text container, which is wider)
    const textRight = measureTextRight();
    const x0 = narrow ? W * 0.08 : Math.min(W * 0.62, Math.max(W * 0.36, textRight + 70));
    const x1 = narrow ? W * 0.92 : W * 0.95;
    if (!narrow) canvas.style.setProperty('--net-fade', Math.round(textRight - 20) + 'px');
    const y0 = narrow ? H - 270 : H * 0.10;
    const y1 = narrow ? H - 30 : H * 0.90;

    nodes = []; edges = []; layers = [];
    sizes.forEach((n, li) => {
      const layer = [];
      const x = x0 + (x1 - x0) * li / (sizes.length - 1);
      const span = (y1 - y0) * (0.35 + 0.65 * n / Math.max(...sizes));
      const top = (y0 + y1) / 2 - span / 2;
      for (let i = 0; i < n; i++) {
        const y = n === 1 ? (y0 + y1) / 2 : top + span * i / (n - 1);
        const node = {
          layer: li, bx: x, by: y, x, y,
          phase: Math.random() * Math.PI * 2,
          act: 0, refractory: 0, out: [],
          r: li === 0 || li === sizes.length - 1 ? 4.2 : 3.4,
        };
        layer.push(node); nodes.push(node);
      }
      layers.push(layer);
    });
    // Dense (fully connected) layers: every neuron links to every neuron in the next layer
    for (let li = 0; li < layers.length - 1; li++) {
      for (const a of layers[li]) for (const b of layers[li + 1]) {
        const e = { a, b, w: Math.random() * 2 - 1, glow: 0 };
        edges.push(e); a.out.push(e);
      }
    }
    pulses = [];
  }

  function resize() {
    const rect = hero.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(1, Math.round(rect.width));
    H = Math.max(1, Math.round(rect.height));
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    build();
    draw();
  }

  function fire(node, strength = 1) {
    if (node.refractory > 0) return;
    node.act = 1;
    node.refractory = 0.35;
    for (const e of node.out) {
      // Stronger weights carry the signal more often
      if (Math.random() < 0.08 + 0.32 * Math.abs(e.w) * strength) {
        pulses.push({ e, p: 0, speed: 0.9 + Math.random() * 0.6, pos: e.w > 0 });
      }
    }
  }

  function update(dt) {
    t += dt;
    // Gentle drift around each neuron's resting position, nudged away from the pointer
    for (const n of nodes) {
      let x = n.bx + Math.sin(t * 0.6 + n.phase) * 6;
      let y = n.by + Math.cos(t * 0.5 + n.phase * 1.3) * 6;
      if (pointer.active) {
        const dx = x - pointer.x, dy = y - pointer.y;
        const d = Math.hypot(dx, dy);
        if (d < 140) {
          const push = (1 - d / 140) * 18;
          x += dx / (d || 1) * push; y += dy / (d || 1) * push;
          if (d < 60 && Math.random() < dt * 3) fire(n, 0.8);
        }
      }
      n.x += (x - n.x) * Math.min(1, dt * 8);
      n.y += (y - n.y) * Math.min(1, dt * 8);
      n.act = Math.max(0, n.act - dt * 1.6);
      n.refractory = Math.max(0, n.refractory - dt);
    }
    for (const e of edges) e.glow = Math.max(0, e.glow - dt * 1.4);

    // A new input arrives every so often
    nextInput -= dt;
    if (nextInput <= 0) {
      const inputs = layers[0];
      fire(inputs[Math.floor(Math.random() * inputs.length)]);
      nextInput = 0.5 + Math.random() * 0.9;
    }

    // Move pulses; on arrival, excitatory pulses can make the neuron fire
    for (const p of pulses) {
      p.p += dt * p.speed;
      p.e.glow = Math.max(p.e.glow, 0.6);
      if (p.p >= 1) {
        p.done = true;
        const b = p.e.b;
        if (p.pos) {
          b.act = Math.min(1, b.act + 0.45 + 0.4 * Math.abs(p.e.w));
          if (b.act > 0.7) fire(b);
        } else {
          b.act = Math.max(0, b.act - 0.2);
        }
      }
    }
    pulses = pulses.filter(p => !p.done);
    if (pulses.length > 400) pulses.splice(0, pulses.length - 400);
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    // Edges: faint base, brighter while a signal travels along them
    ctx.lineWidth = 1;
    for (const e of edges) {
      const base = 0.035 + 0.075 * Math.abs(e.w);
      const a = base + e.glow * 0.35;
      ctx.strokeStyle = e.glow > 0.02 && e.w > 0 ? `rgba(${accent},${a})` : `rgba(${ink},${a})`;
      ctx.beginPath(); ctx.moveTo(e.a.x, e.a.y); ctx.lineTo(e.b.x, e.b.y); ctx.stroke();
    }

    // Pulses
    for (const p of pulses) {
      const { a, b } = p.e;
      const x = a.x + (b.x - a.x) * p.p, y = a.y + (b.y - a.y) * p.p;
      ctx.fillStyle = p.pos ? `rgba(${accent},.95)` : `rgba(${ink},.45)`;
      ctx.beginPath(); ctx.arc(x, y, p.pos ? 2.2 : 1.6, 0, Math.PI * 2); ctx.fill();
    }

    // Neurons
    for (const n of nodes) {
      if (n.act > 0.05) {
        const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, 22);
        g.addColorStop(0, `rgba(${accent},${0.35 * n.act})`);
        g.addColorStop(1, `rgba(${accent},0)`);
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(n.x, n.y, 22, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = n.act > 0.05 ? `rgba(${accent},${0.5 + 0.5 * n.act})` : `rgba(${ink},.38)`;
      ctx.beginPath(); ctx.arc(n.x, n.y, n.r + n.act * 1.5, 0, Math.PI * 2); ctx.fill();
    }
  }

  function frame(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - (last || now)) / 1000);
    last = now;
    update(dt);
    draw();
    raf = requestAnimationFrame(frame);
  }

  function start() {
    if (reduce || running || !visible || document.hidden) return;
    running = true; last = 0;
    raf = requestAnimationFrame(frame);
  }
  function stop() { running = false; cancelAnimationFrame(raf); }

  // Pointer interaction is attached to the hero so the text stays selectable
  hero.addEventListener('pointermove', (e) => {
    const r = hero.getBoundingClientRect();
    pointer.x = e.clientX - r.left; pointer.y = e.clientY - r.top; pointer.active = e.pointerType === 'mouse';
  });
  hero.addEventListener('pointerleave', () => { pointer.active = false; });
  hero.addEventListener('pointerdown', (e) => {
    if (e.target.closest('a, button')) return;
    const r = hero.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    // Fire the nearest neuron, or the whole input layer when the tap is far away
    let best = null, bd = 1e9;
    for (const n of nodes) { const d = Math.hypot(n.x - x, n.y - y); if (d < bd) { bd = d; best = n; } }
    if (best && bd < 120) { best.refractory = 0; fire(best, 1.2); }
    else layers[0].forEach(n => { n.refractory = 0; fire(n, 1.2); });
    if (reduce) { nodes.forEach(n => (n.act = 0)); }
  });

  readColors();
  resize();
  new ResizeObserver(resize).observe(hero);
  // Web fonts change the text width; re-place the network once they load
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(resize);
  new IntersectionObserver((entries) => {
    visible = entries[0].isIntersecting;
    visible ? start() : stop();
  }).observe(hero);
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  window.addEventListener('themechange', () => { readColors(); draw(); });
  start();
})();
