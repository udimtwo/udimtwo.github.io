/* ============================================================
   UDimTwo — portfolio
   ============================================================ */
(() => {
'use strict';

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/* ============================================================
   Toast
   ============================================================ */
const toastEl = $('#toast');
let toastTimer;
function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2200);
}

/* ============================================================
   Nav — stuck state, active link, mobile menu, scroll progress
   ============================================================ */
const nav      = $('#nav');
const navLinks = $('.nav-links');
const menuBtn  = $('#menuBtn');
const bar      = $('#scrollBar');

menuBtn.addEventListener('click', () => {
  const open = navLinks.classList.toggle('open');
  menuBtn.setAttribute('aria-expanded', String(open));
});
navLinks.addEventListener('click', e => {
  if (e.target.tagName === 'A') {
    navLinks.classList.remove('open');
    menuBtn.setAttribute('aria-expanded', 'false');
  }
});

const sections = ['top', 'launch', 'idle', 'flight', 'work', 'contact']
  .map(id => document.getElementById(id))
  .filter(Boolean);

let ticking = false;
function onScroll() {
  const y = window.scrollY;
  nav.classList.toggle('stuck', y > 40);

  const max = document.documentElement.scrollHeight - innerHeight;
  bar.style.width = (max > 0 ? (y / max) * 100 : 0) + '%';

  // active nav link
  let current = sections[0];
  for (const s of sections) {
    if (s.getBoundingClientRect().top <= innerHeight * 0.35) current = s;
  }
  $$('[data-nav]').forEach(a =>
    a.classList.toggle('active', a.getAttribute('href') === '#' + current.id)
  );

  ticking = false;
}
addEventListener('scroll', () => {
  if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
}, { passive: true });
onScroll();

/* ============================================================
   Reveal on scroll
   ============================================================ */
const revealObserver = new IntersectionObserver((entries, obs) => {
  for (const e of entries) {
    if (e.isIntersecting) { e.target.classList.add('in'); obs.unobserve(e.target); }
  }
}, { threshold: 0.12, rootMargin: '0px 0px -40px' });

$$('.reveal').forEach(el => revealObserver.observe(el));

/* ============================================================
   PST clock
   ============================================================ */
const TZ = 'America/Los_Angeles';
const fmtHM = new Intl.DateTimeFormat('en-US', {
  timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false
});
const fmtHMS = new Intl.DateTimeFormat('en-US', {
  timeZone: TZ, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
});

function tick() {
  const now = new Date();
  const hour = +new Intl.DateTimeFormat('en-US', {
    timeZone: TZ, hour: 'numeric', hour12: false
  }).format(now) % 24;

  $('#tzTime').textContent  = fmtHM.format(now);
  $('#tzTime2').textContent = fmtHMS.format(now);

  const awake = hour >= 9 && hour < 24;
  for (const d of [$('#tzDot'), $('#tzDot2')]) {
    d.classList.toggle('awake', awake);
    d.classList.toggle('asleep', !awake);
  }
  $('#tzState').textContent = awake ? '· usually reachable' : '· probably asleep';
  $('#tzChip').title = `My local time — Pacific Time (${TZ})`;
}
tick();
setInterval(tick, 1000);

$('#year').textContent = new Date().getFullYear();

/* ============================================================
   Copy to clipboard
   ============================================================ */
async function copyDiscord(btn) {
  const text = btn.dataset.copy;
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch {}
    ta.remove();
  }
  btn.classList.add('copied');
  const label = btn.querySelector('.copy-label');
  const original = label ? label.textContent : '';
  if (label) label.textContent = 'copied!';
  toast(`Discord handle copied — ${text}`);
  setTimeout(() => {
    btn.classList.remove('copied');
    if (label) label.textContent = original;
  }, 1800);
}
$$('.copy-btn').forEach(b => b.addEventListener('click', () => copyDiscord(b)));

/* ============================================================
   Lightbox
   ============================================================ */
const lb      = $('#lightbox');
const lbImg   = $('#lightboxImg');
const lbCap   = $('#lightboxCap');
let lbOpener  = null;

function openLightbox(btn) {
  const img = btn.querySelector('img');
  lbImg.src = btn.dataset.full;
  lbImg.alt = img ? img.alt : '';
  const cap = btn.closest('figure')?.querySelector('figcaption');
  lbCap.innerHTML = cap ? cap.innerHTML : '';
  lb.hidden = false;
  lbOpener = btn;
  $('#lightboxClose').focus();
}
function closeLightbox() {
  lb.hidden = true;
  lbImg.src = '';
  if (lbOpener) { lbOpener.focus(); lbOpener = null; }
}

$$('.shot-btn').forEach(b => b.addEventListener('click', () => openLightbox(b)));
$('#lightboxClose').addEventListener('click', closeLightbox);
// click the backdrop (but not the image itself) to dismiss
lb.addEventListener('click', e => { if (!e.target.closest('.lightbox-inner')) closeLightbox(); });

/* ============================================================
   Escape closes the lightbox
   ============================================================ */
addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (!lb.hidden) { closeLightbox(); return; }
  if (/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) {
    document.activeElement.blur();
  }
});

/* ============================================================
   Hero canvas — velocity streaks
   ============================================================ */
(function heroCanvas() {
  const cv = $('#heroCanvas');
  if (!cv) return;
  const ctx = cv.getContext('2d');

  let w = 0, h = 0, dpr = 1, streaks = [], stars = [];

  const COLORS = ['#4cc9ff', '#a86bff', '#ff6b35', '#ffc94d'];

  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    const nw = cv.clientWidth, nh = cv.clientHeight;
    if (!nw || !nh || (nw === w && nh === h)) return;   // ignore 0-size / no-op layouts
    w = nw; h = nh;
    cv.width = w * dpr; cv.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    build();
  }

  function build() {
    const n = clamp(Math.round(w / 11), 40, 130);
    streaks = Array.from({ length: n }, () => spawn(true));
    stars = Array.from({ length: clamp(Math.round(w / 9), 60, 190) }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 1.2 + .25,
      a: Math.random() * .5 + .12,
      d: Math.random() * .55 + .12
    }));
  }

  function spawn(anywhere) {
    const depth = Math.random();               // 0 = far, 1 = near
    return {
      x: anywhere ? Math.random() * w : w + Math.random() * 220,
      y: Math.random() * h,
      len: 26 + depth * 150,
      sp: .5 + depth * 5.2,
      a: .05 + depth * .3,
      lw: .5 + depth * 1.4,
      c: COLORS[(Math.random() * COLORS.length) | 0]
    };
  }

  // scroll adds a burst of speed — the whole site is about momentum
  let boost = 0, lastY = scrollY;
  addEventListener('scroll', () => {
    boost = clamp(boost + Math.abs(scrollY - lastY) * .05, 0, 9);
    lastY = scrollY;
  }, { passive: true });

  let running = !reduced, raf;

  function frame() {
    ctx.clearRect(0, 0, w, h);

    // parallax star dust
    for (const s of stars) {
      s.x -= (s.d + boost * .35);
      if (s.x < -3) { s.x = w + 3; s.y = Math.random() * h; }
      ctx.globalAlpha = s.a;
      ctx.fillStyle = '#c8d4f0';
      ctx.fillRect(s.x, s.y, s.r, s.r);
    }

    // velocity streaks
    ctx.lineCap = 'round';
    for (const p of streaks) {
      const v = p.sp + boost;
      p.x -= v;
      if (p.x + p.len < -40) Object.assign(p, spawn(false));

      const g = ctx.createLinearGradient(p.x, 0, p.x + p.len, 0);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(1, p.c);

      ctx.globalAlpha = p.a + Math.min(boost * .035, .28);
      ctx.strokeStyle = g;
      ctx.lineWidth = p.lw;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + p.len, p.y);
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
    boost *= .93;
    raf = requestAnimationFrame(frame);
  }

  function start() { if (!running && !reduced) { running = true; frame(); } }
  function stop()  { running = false; cancelAnimationFrame(raf); }

  // ResizeObserver rather than a one-shot measure: the element can be 0-wide at
  // parse time (hidden tab, late fonts) and would otherwise never recover.
  new ResizeObserver(resize).observe(cv);
  addEventListener('resize', resize);   // belt-and-braces; resize() no-ops when unchanged
  document.addEventListener('visibilitychange', () => document.hidden ? stop() : start());

  resize();
  if (reduced) {
    // static single frame
    for (const s of stars) { ctx.globalAlpha = s.a; ctx.fillStyle = '#c8d4f0'; ctx.fillRect(s.x, s.y, s.r, s.r); }
    ctx.globalAlpha = 1;
  } else {
    frame();
  }
})();

})();
