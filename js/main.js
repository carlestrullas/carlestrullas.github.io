(function () {
  const root = document.documentElement;
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const isDark = () => root.dataset.theme ? root.dataset.theme === 'dark' : mq.matches;
  const announce = () => window.dispatchEvent(new Event('themechange'));

  // Theme toggle
  const btn = document.querySelector('.theme-toggle');
  const label = () => btn && btn.setAttribute('aria-label', isDark() ? 'Switch to light theme' : 'Switch to dark theme');
  label();
  btn && btn.addEventListener('click', () => {
    root.dataset.theme = isDark() ? 'light' : 'dark';
    try { localStorage.setItem('theme', root.dataset.theme); } catch (e) {}
    label();
    announce();
  });
  mq.addEventListener('change', () => { if (!root.dataset.theme) { label(); announce(); } });

  // Header border once the page scrolls
  const header = document.querySelector('.site-header');
  const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 8);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // Mobile menu
  const toggle = document.querySelector('.nav-toggle');
  const setMenu = (open) => {
    if (!toggle) return;
    header.classList.toggle('nav-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  };
  if (toggle) {
    toggle.addEventListener('click', () => setMenu(!header.classList.contains('nav-open')));
    document.querySelectorAll('.nav-list a').forEach(a => a.addEventListener('click', () => setMenu(false)));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });
    document.addEventListener('click', (e) => { if (!header.contains(e.target)) setMenu(false); });
    window.matchMedia('(min-width: 761px)').addEventListener('change', (e) => { if (e.matches) setMenu(false); });
  }

  // Highlight the nav link for the section in view
  const links = new Map([...document.querySelectorAll('.nav-list a')].map(a => [a.getAttribute('href').slice(1), a]));
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      const a = links.get(e.target.id);
      if (a && e.isIntersecting) {
        links.forEach(l => l.removeAttribute('aria-current'));
        a.setAttribute('aria-current', 'true');
      }
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  links.forEach((_, id) => { const s = document.getElementById(id); s && io.observe(s); });

  const y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();
})();
