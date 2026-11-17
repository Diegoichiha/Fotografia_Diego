/* ───────────────────────────────────────────────
   Diego Aranzazu · Portafolio — comportamiento
   GSAP + ScrollTrigger + Flip + Lenis (todo local en assets/vendor)
   Mejora progresiva: sin JS el sitio se ve completo y navegable.
   ─────────────────────────────────────────────── */
(() => {
  'use strict';

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const smooth = (t) => t * t * (3 - 2 * t);

  if (!window.gsap) { document.body.classList.remove('is-loading'); return; }

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

  gsap.registerPlugin(ScrollTrigger, Flip);
  gsap.defaults({ ease: 'power3.out' });
  ScrollTrigger.config({ ignoreMobileResize: true });
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  const safe = (name, fn) => { try { fn(); } catch (e) { console.error('[init ' + name + ']', e); } };

  /* ═════════ Scroll suave (Lenis) ═════════ */
  let lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new Lenis({ duration: 1.0, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), wheelMultiplier: 0.95 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
    window.lenis = lenis; // útil para depurar desde la consola
  }
  const lockScroll = () => { lenis ? lenis.stop() : (document.body.style.overflow = 'hidden'); };
  const unlockScroll = () => { lenis ? lenis.start() : (document.body.style.overflow = ''); };
  const scrollToTarget = (target, opts = {}) => {
    if (lenis) lenis.scrollTo(target, { duration: 1.6, easing: (t) => 1 - Math.pow(1 - t, 4), ...opts });
    else {
      const el = typeof target === 'string' ? $(target) : target;
      if (el && el.scrollIntoView) el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
      else if (typeof target === 'number') window.scrollTo({ top: target });
    }
  };

  /* ═════════ Utilidades de texto ═════════ */
  function splitWords(el) {
    const text = el.textContent.trim().replace(/\s+/g, ' ');
    el.setAttribute('aria-label', text);
    el.innerHTML = text.split(' ').map((w) => `<span class="w" aria-hidden="true">${w}</span>`).join(' ');
    return $$('.w', el);
  }

  /* ═════════ Cursor personalizado ═════════ */
  function initCursor() {
    if (!finePointer || reduce) return;
    const cur = $('.cursor'), ring = $('.cursor__ring'), dot = $('.cursor__dot'), label = $('b', ring);
    gsap.set([ring, dot], { xPercent: -50, yPercent: -50 });
    const rx = gsap.quickTo(ring, 'x', { duration: 0.55, ease: 'power3' });
    const ry = gsap.quickTo(ring, 'y', { duration: 0.55, ease: 'power3' });
    const dx = gsap.quickTo(dot, 'x', { duration: 0.1, ease: 'power3' });
    const dy = gsap.quickTo(dot, 'y', { duration: 0.1, ease: 'power3' });
    let shown = false;
    window.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      if (!shown) { shown = true; document.body.classList.add('has-cursor'); gsap.set([ring, dot], { x: e.clientX, y: e.clientY }); }
      rx(e.clientX); ry(e.clientY); dx(e.clientX); dy(e.clientY);
    }, { passive: true });
    document.addEventListener('pointerover', (e) => {
      const t = e.target.closest && e.target.closest('[data-cursor]');
      if (t) { label.textContent = t.dataset.cursor; cur.classList.add('is-label'); }
      else cur.classList.remove('is-label');
    });
    document.addEventListener('pointerdown', () => cur.classList.add('is-down'));
    document.addEventListener('pointerup', () => cur.classList.remove('is-down'));
    document.documentElement.addEventListener('pointerleave', () => gsap.to(cur, { opacity: 0, duration: 0.2 }));
    document.documentElement.addEventListener('pointerenter', () => gsap.to(cur, { opacity: 1, duration: 0.2 }));
  }

  /* ═════════ Botones magnéticos ═════════ */
  function initMagnetic() {
    if (!finePointer || reduce) return;
    $$('[data-magnetic]').forEach((el) => {
      const mx = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3' });
      const my = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3' });
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        mx((e.clientX - (r.left + r.width / 2)) * 0.28);
        my((e.clientY - (r.top + r.height / 2)) * 0.4);
      });
      el.addEventListener('pointerleave', () => { mx(0); my(0); });
    });
  }

  /* ═════════ Navegación ═════════ */
  function initNav() {
    const nav = $('#nav'), burger = $('.nav__burger'), menu = $('.menu');
    let menuOpen = false;

    ScrollTrigger.create({
      start: 0, end: 'max',
      onUpdate: (self) => {
        const y = self.scroll();
        nav.classList.toggle('is-scrolled', y > 40);
        if (menuOpen) return;
        if (y > 500 && self.direction === 1 && self.getVelocity() > 150) nav.classList.add('is-hidden');
        else if (self.direction === -1 || y < 500) nav.classList.remove('is-hidden');
      },
    });
    gsap.to('.progress span', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: 0.2 } });

    const links = $$('.nav__links a');
    ['seleccion', 'rafagas', 'colibries', 'colecciones', 'galeria', 'sobre-mi'].forEach((id) => {
      const sec = document.getElementById(id);
      if (!sec) return;
      ScrollTrigger.create({
        trigger: sec, start: 'top 55%', end: 'bottom 55%',
        onToggle: (s) => links.forEach((a) => a.classList.toggle('is-active', s.isActive ? a.dataset.nav === id : a.classList.contains('is-active') && a.dataset.nav !== id)),
      });
    });

    const setMenu = (open) => {
      menuOpen = open;
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
      menu.classList.toggle('is-open', open);
      menu.setAttribute('aria-hidden', String(!open));
      open ? lockScroll() : unlockScroll();
      if (open) { nav.classList.remove('is-hidden'); gsap.fromTo('.menu a', { y: 50, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, stagger: 0.06, delay: 0.25 }); }
    };
    burger.addEventListener('click', () => setMenu(!menuOpen));

    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a || a.matches('[data-filter]')) return;
      const hash = a.getAttribute('href');
      if (hash === '#') return;
      const target = hash === '#inicio' ? 0 : $(hash);
      if (target === null) return;
      e.preventDefault();
      if (menuOpen) { setMenu(false); setTimeout(() => scrollToTarget(target), 350); }
      else scrollToTarget(target);
    });
  }

  /* ═════════ Hero ═════════ */
  const hero = { start: () => {}, ready: false };
  function initHero() {
    const slides = $$('.hero__slide');
    const n = slides.length;
    const barsWrap = $('.hero__bars');
    const idxEl = $('.hero__idx'), titleEl = $('.hero__captitle'), spEl = $('.hero__capsp');
    const DUR = 6.8;
    let cur = 0, busy = false, barTw = null, kb = null, playing = false, inView = true;

    const bars = slides.map((_, i) => {
      const b = document.createElement('span');
      b.setAttribute('role', 'button'); b.setAttribute('tabindex', '0'); b.setAttribute('aria-label', 'Ver foto ' + (i + 1));
      b.addEventListener('click', () => go(i));
      b.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(i); } });
      barsWrap.appendChild(b);
      return b;
    });

    const imgOf = (s) => $('img', s);
    const caption = (i, animate) => {
      const s = slides[i];
      const write = () => { titleEl.textContent = s.dataset.title; spEl.textContent = s.dataset.sp; idxEl.textContent = String(i + 1).padStart(2, '0'); };
      if (!animate) { write(); return; }
      gsap.to(titleEl, { yPercent: -110, duration: 0.35, ease: 'power2.in', onComplete: () => { write(); gsap.fromTo(titleEl, { yPercent: 110 }, { yPercent: 0, duration: 0.7 }); } });
      gsap.fromTo(spEl, { opacity: 0 }, { opacity: 1, duration: 0.8, delay: 0.4 });
    };
    const drift = (i) => {
      if (kb) kb.kill();
      kb = gsap.to(imgOf(slides[i]), { scale: 1.16, duration: DUR + 2, ease: 'none', overwrite: 'auto' });
    };
    const progress = (i) => {
      if (barTw) barTw.kill();
      bars.forEach((b, k) => gsap.set(b, { '--p': k < i ? 1 : 0 }));
      barTw = gsap.fromTo(bars[i], { '--p': 0 }, { '--p': 1, duration: DUR, ease: 'none', onComplete: () => go((cur + 1) % n) });
      barTw.paused(!playing || !inView);
    };
    function go(i) {
      if (busy || i === cur) return;
      busy = true;
      if (barTw) barTw.kill();
      const from = slides[cur], to = slides[i];
      const dir = i > cur || (cur === n - 1 && i === 0) ? 1 : -1;
      gsap.set(to, { visibility: 'visible', zIndex: 2 });
      gsap.set(from, { zIndex: 1 });
      const tl = gsap.timeline({
        onComplete: () => {
          from.classList.remove('is-active'); to.classList.add('is-active');
          gsap.set(from, { visibility: 'hidden', clearProps: 'zIndex' }); gsap.set(to, { clearProps: 'zIndex,clipPath' });
          cur = i; busy = false; progress(i);
        },
      });
      tl.fromTo(to, { clipPath: dir > 0 ? 'inset(0% 0% 0% 100%)' : 'inset(0% 100% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.5, ease: 'power4.inOut' }, 0)
        .fromTo(imgOf(to), { scale: 1.4, xPercent: 9 * dir }, { scale: 1.08, xPercent: 0, duration: 1.9, ease: 'power3.out' }, 0)
        .to(imgOf(from), { xPercent: -14 * dir, duration: 1.5, ease: 'power4.inOut' }, 0)
        .add(() => { caption(i, true); drift(i); }, 0.35);
      bars.forEach((b, k) => gsap.set(b, { '--p': k < i ? 1 : k === i ? 0 : 0 }));
    }

    caption(0, false);
    slides[0].classList.add('is-active');

    ScrollTrigger.create({
      trigger: '.hero', start: 'top top', end: 'bottom top',
      onToggle: (s) => { inView = s.isActive; if (barTw) barTw.paused(!playing || !inView); },
    });
    document.addEventListener('visibilitychange', () => { if (barTw) barTw.paused(document.hidden || !playing || !inView); });

    hero.start = () => { playing = true; hero.ready = true; progress(0); drift(0); };

    // Parallax con el mouse
    if (finePointer && !reduce) {
      const layer = $('.hero__slides'), title = $('.hero__title');
      gsap.set(layer, { scale: 1.05 });
      const lx = gsap.quickTo(layer, 'x', { duration: 1.2 }), ly = gsap.quickTo(layer, 'y', { duration: 1.2 });
      const tx = gsap.quickTo(title, 'x', { duration: 1.4 }), ty = gsap.quickTo(title, 'y', { duration: 1.4 });
      $('.hero').addEventListener('pointermove', (e) => {
        const px = e.clientX / innerWidth - 0.5, py = e.clientY / innerHeight - 0.5;
        lx(px * -26); ly(py * -18); tx(px * 18); ty(py * 10);
      });
    }

    if (!reduce) {
      gsap.to('.hero__slides', { yPercent: 14, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
      gsap.to('.hero__title', { yPercent: -30, opacity: 0.15, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: '70% top', scrub: true } });
      gsap.to('.hero__foot,.hero__top', { opacity: 0, ease: 'none', scrollTrigger: { trigger: '.hero', start: '10% top', end: '55% top', scrub: true } });
    }
  }

  /* ═════════ Preloader (diafragma) ═════════ */
  function runLoader() {
    const body = document.body;
    const loader = $('.loader');
    const finish = () => { body.classList.remove('is-loading'); loader && loader.remove(); unlockScroll(); };
    // estado inicial del hero
    const titleLines = $$('.hero__title .line__in');
    gsap.set(titleLines, { yPercent: 115 });
    gsap.set('.hero__top,.hero__foot,.nav', { opacity: 0 });
    gsap.set('.hero__slide.is-active img', { scale: 1.35 });

    if (reduce || !loader) {
      gsap.set(titleLines, { yPercent: 0 });
      gsap.set('.hero__top,.hero__foot,.nav', { opacity: 1 });
      gsap.set('.hero__slide.is-active img', { scale: 1 });
      finish(); hero.start(); afterIntro();
      return;
    }

    const num = $('.loader__num'), prog = $('.loader__prog'), blades = $$('.blade'), iris = $('.loader__iris');
    const st = { v: 0 };
    const render = () => {
      num.textContent = String(Math.round(st.v)).padStart(3, '0');
      prog.style.strokeDashoffset = 653.5 * (1 - st.v / 100);
      gsap.set('.loader__blades', { rotation: st.v * 0.9, svgOrigin: '0 0' });
    };
    let seen = false;
    try { seen = sessionStorage.getItem('da_seen') === '1'; } catch (e) { /* sin almacenamiento */ }
    const firstImg = $('.hero__slide.is-active img');
    const assets = Promise.all([
      document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve(),
      firstImg && firstImg.decode ? firstImg.decode().catch(() => {}) : Promise.resolve(),
      new Promise((r) => setTimeout(r, seen ? 0 : 650)),
    ]);

    const counting = gsap.to(st, { v: 92, duration: seen ? 0.05 : 0.9, ease: 'power2.out', onUpdate: render });
    let revealed = false;
    const reveal = () => {
      if (revealed) return; revealed = true;
      counting.kill();
      gsap.to(st, { v: 100, duration: seen ? 0.1 : 0.3, ease: 'power1.out', onUpdate: render, onComplete: open });
    };
    const open = () => {
      try { sessionStorage.setItem('da_seen', '1'); } catch (e) { /* sin almacenamiento */ }
      const tl = gsap.timeline({ onComplete: () => { finish(); afterIntro(); } });
      tl.to('.loader__top,.loader__count', { opacity: 0, duration: 0.25 }, 0)
        .to(loader, { backgroundColor: 'rgba(8,11,9,0)', duration: 0.25, ease: 'none' }, 0.1)
        .to(blades, { y: -135, duration: 0.85, ease: 'power3.inOut' }, 0.1)
        .to(iris, { scale: 6, rotation: 40, duration: 1, ease: 'power3.in' }, 0.2)
        .to('.hero__slide.is-active img', { scale: 1.06, duration: 1.8, ease: 'power3.out' }, 0.2)
        .to(titleLines, { yPercent: 0, duration: 1.1, stagger: 0.1, ease: 'power4.out' }, 0.5)
        .to('.hero__top,.hero__foot', { opacity: 1, duration: 0.8, stagger: 0.08 }, 0.75)
        .to('.nav', { opacity: 1, duration: 0.7 }, 0.8)
        .to(loader, { autoAlpha: 0, duration: 0.25 }, 0.95)
        .add(() => { hero.start(); }, 1.05);
      if (seen) tl.timeScale(1.5);
    };
    assets.then(reveal);
    setTimeout(reveal, 4500); // red de seguridad
  }

  function afterIntro() {
    ScrollTrigger.refresh();
    if (location.hash && location.hash.length > 1) {
      const t = $(location.hash);
      if (t) setTimeout(() => scrollToTarget(t, { immediate: reduce }), 100);
    }
  }

  /* ═════════ Marquee ═════════ */
  function initMarquee() {
    const track = $('.marquee__track'), group = $('.marquee__group');
    if (!track || !group) return;
    track.appendChild(group.cloneNode(true));
    if (reduce) { gsap.to(track, { xPercent: -50, duration: 120, ease: 'none', repeat: -1 }); return; }
    const tw = gsap.to(track, { xPercent: -50, duration: 55, ease: 'none', repeat: -1 });
    let dir = 1;
    ScrollTrigger.create({
      start: 0, end: 'max',
      onUpdate: (self) => {
        dir = self.direction;
        tw.timeScale(dir * (1 + Math.min(Math.abs(self.getVelocity()) / 260, 7)));
      },
    });
    gsap.ticker.add(() => {
      const ts = tw.timeScale();
      if (Math.abs(ts - dir) > 0.01) tw.timeScale(ts + (dir - ts) * 0.045);
    });
  }

  /* ═════════ Colibríes: cintas de fotos ═════════ */
  function initHumming() {
    const rows = $$('.hum__row');
    if (!rows.length) return;
    // Las fotos llevan data-src: no se piden hasta que la sección esté cerca (evita bajar ~50 fotos al abrir la página)
    const sec = $('.hum');
    const wake = () => $$('img[data-src]', sec).forEach((im) => {
      im.srcset = im.dataset.srcset; im.sizes = im.dataset.sizes; im.src = im.dataset.src;
      im.removeAttribute('data-src'); im.removeAttribute('data-srcset'); im.removeAttribute('data-sizes');
    });
    if ('IntersectionObserver' in window) {
      const o = new IntersectionObserver((es) => { if (es.some((x) => x.isIntersecting)) { wake(); o.disconnect(); } }, { rootMargin: '1400px 0px' });
      o.observe(sec);
    } else wake();
    const tweens = [];
    rows.forEach((row, i) => {
      const track = $('.hum__track', row), group = $('.hum__group', row);
      if (!track || !group) return;
      if (reduce) return;
      track.appendChild(group.cloneNode(true));
      const dir0 = i % 2 === 0 ? 1 : -1;
      const base = 70 + i * 12; // segundos por vuelta
      const tw = gsap.fromTo(track, { xPercent: dir0 > 0 ? 0 : -50 }, { xPercent: dir0 > 0 ? -50 : 0, duration: base, ease: 'none', repeat: -1 });
      tweens.push({ tw, dir0, hover: false });
      row.addEventListener('pointerenter', () => { tweens[i] && (tweens[i].hover = true); });
      row.addEventListener('pointerleave', () => { tweens[i] && (tweens[i].hover = false); });
    });
    if (!tweens.length) return;
    let boost = 0;
    ScrollTrigger.create({
      trigger: '.hum', start: 'top bottom', end: 'bottom top',
      onUpdate: (self) => { boost = Math.min(Math.abs(self.getVelocity()) / 220, 6) * self.direction; },
    });
    gsap.ticker.add(() => {
      boost *= 0.94;
      tweens.forEach((t) => {
        const target = t.hover ? 0.12 : 1;
        const want = target + (t.hover ? 0 : boost * t.dir0 * 0 + Math.abs(boost) * 0.8);
        const ts = t.tw.timeScale();
        t.tw.timeScale(ts + (want - ts) * 0.06);
      });
    });
  }

  /* ═════════ Manifiesto / textos / contadores ═════════ */
  function initIntro() {
    const t = $('.intro__text');
    if (t) {
      const words = splitWords(t);
      if (reduce) gsap.set(words, { opacity: 1 });
      else gsap.to(words, { opacity: 1, ease: 'none', stagger: 0.12, scrollTrigger: { trigger: t, start: 'top 82%', end: 'bottom 48%', scrub: true } });
    }
    const f = $('.intro__float');
    if (f && !reduce) {
      gsap.fromTo(f, { y: 90 }, { y: -90, ease: 'none', scrollTrigger: { trigger: '.intro', start: 'top bottom', end: 'bottom top', scrub: true } });
      gsap.fromTo($('img', f), { yPercent: -7 }, { yPercent: 7, ease: 'none', scrollTrigger: { trigger: f, start: 'top bottom', end: 'bottom top', scrub: true } });
    }
    $$('[data-count]').forEach((el) => {
      const end = parseInt(el.dataset.count, 10) || 0;
      if (reduce) { el.textContent = end; return; }
      const o = { v: 0 };
      ScrollTrigger.create({
        trigger: el, start: 'top 90%', once: true,
        onEnter: () => gsap.to(o, { v: end, duration: 2.2, ease: 'power3.out', onUpdate: () => { el.textContent = Math.round(o.v); } }),
      });
    });
  }

  /* ═════════ Revelados genéricos ═════════ */
  function initReveals() {
    if (reduce) return;
    const sel = '.display:not([data-words]), .eyebrow, .burst__lead, .sel__hint, .coll__row, .gal__filters, .gal__head .gal__count, .about__text p, .gear li, .principles li, .contact__text, .clink, .sel__end > *, .stats li';
    const els = $$(sel);
    gsap.set(els, { opacity: 0, y: 42 });
    ScrollTrigger.batch(els, {
      start: 'top 90%', once: true,
      onEnter: (b) => gsap.to(b, { opacity: 1, y: 0, duration: 1.1, stagger: 0.08, overwrite: 'auto' }),
    });
    // textos por palabra (banda y contacto)
    $$('.band__text, .contact__title').forEach((t) => {
      const words = splitWords(t);
      gsap.set(words, { yPercent: 70, opacity: 0 });
      ScrollTrigger.create({
        trigger: t, start: 'top 85%', once: true,
        onEnter: () => gsap.to(words, { yPercent: 0, opacity: 1, duration: 1.2, stagger: 0.09, ease: 'power4.out' }),
      });
    });
    // pastillas fotos sobre mí
    $$('.about__ph').forEach((p, i) => {
      gsap.from(p, { clipPath: 'inset(100% 0% 0% 0%)', duration: 1.5, ease: 'power4.inOut', delay: i * 0.1, scrollTrigger: { trigger: '.about__collage', start: 'top 78%', once: true } });
      gsap.fromTo($('img', p), { yPercent: -7 }, { yPercent: 7, ease: 'none', scrollTrigger: { trigger: p, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
    gsap.fromTo('.band__media', { yPercent: -9 }, { yPercent: 9, ease: 'none', scrollTrigger: { trigger: '.band', start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.fromTo('.foot__big span', { yPercent: 40 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: '.foot', start: 'top bottom', end: 'bottom bottom', scrub: true } });
  }

  /* ═════════ Selección: scroll horizontal ═════════ */
  function initSelect() {
    const mm = gsap.matchMedia();
    mm.add('(min-width: 901px) and (prefers-reduced-motion: no-preference)', () => {
      const sec = $('.sel'), track = $('.sel__track');
      if (!sec || !track) return;
      const dist = () => Math.max(0, track.scrollWidth - window.innerWidth);
      const tween = gsap.to(track, {
        x: () => -dist(), ease: 'none',
        scrollTrigger: {
          trigger: sec, start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 0.9, anticipatePin: 1, invalidateOnRefresh: true,
          onUpdate: (self) => gsap.set('.sel__bar span', { scaleX: self.progress }),
        },
      });
      $$('.sel__slide').forEach((s) => {
        gsap.fromTo($('.sel__img', s), { xPercent: -4 }, { xPercent: 4, ease: 'none', scrollTrigger: { trigger: s, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true } });
        gsap.from(s, { opacity: 0.25, scale: 0.94, ease: 'none', scrollTrigger: { trigger: s, containerAnimation: tween, start: 'left 100%', end: 'left 70%', scrub: true } });
      });
    });
    mm.add('(max-width: 900px), (prefers-reduced-motion: reduce)', () => {
      const track = $('.sel__track');
      if (track) track.setAttribute('data-lenis-prevent', '');
      return () => track && track.removeAttribute('data-lenis-prevent');
    });
  }

  /* ═════════ Ráfagas ═════════ */
  function initBurst() {
    const mm = gsap.matchMedia();
    mm.add('(min-width: 901px) and (prefers-reduced-motion: no-preference)', () => {
      const sec = $('.burst'), pin = $('.burst__pin');
      const pairs = $$('.burst__pair'), idx = $$('.burst__index li');
      const n = pairs.length;
      if (!sec || !n) return;
      const frameNow = $('.burst__frame-now'), meta = $('.burst__meta');
      let last = { i: -1, half: -1 };

      ScrollTrigger.create({
        trigger: sec, start: 'top top', end: () => '+=' + Math.round(innerHeight * 1.35 * n), pin, scrub: true, anticipatePin: 1, invalidateOnRefresh: true,
        onUpdate: (self) => {
          const p = self.progress * n;
          const i = Math.min(n - 1, Math.floor(p));
          const l = p - i;
          pairs.forEach((el, k) => {
            const fin = k === 0 ? 1 : clamp(l / 0.07);
            const fout = k === n - 1 ? 1 : clamp((1 - l) / 0.07);
            const o = k === i ? fin * fout : (k === i - 1 && l < 0.07 ? clamp(1 - l / 0.07) : (k === i + 1 && l > 0.93 ? clamp((l - 0.93) / 0.07) : 0));
            el.style.opacity = o.toFixed(3);
            el.style.visibility = o > 0.001 ? 'visible' : 'hidden';
          });
          const w = smooth(clamp((l - 0.24) / 0.5));
          const pair = pairs[i];
          const b = $('.burst__frame--b', pair), scan = $('.burst__scan', pair);
          b.style.clipPath = `inset(0 ${((1 - w) * 100).toFixed(2)}% 0 0)`;
          scan.style.left = (w * 100).toFixed(2) + '%';
          scan.style.opacity = w > 0.003 && w < 0.997 ? 1 : 0;
          pairs.forEach((el, k) => { if (k !== i) { $('.burst__frame--b', el).style.clipPath = 'inset(0 100% 0 0)'; $('.burst__scan', el).style.opacity = 0; } });
          const half = w >= 0.5 ? 1 : 0;
          if (last.i !== i || last.half !== half) {
            last = { i, half };
            idx.forEach((li, k) => li.classList.toggle('is-on', k === i));
            $('.burst__tag--a', pair).classList.toggle('is-on', !half);
            $('.burst__tag--b', pair).classList.toggle('is-on', !!half);
            frameNow.textContent = half ? 'B' : 'A';
            meta.textContent = (half ? pair.dataset.metaB : pair.dataset.metaA) + (pair.dataset.dt ? '  ·  ' + pair.dataset.dt : '');
          }
        },
      });
      idx[0] && idx[0].classList.add('is-on');
      const first = pairs[0]; if (first) { $('.burst__tag--a', first).classList.add('is-on'); meta.textContent = first.dataset.metaA + (first.dataset.dt ? '  ·  ' + first.dataset.dt : ''); }

      return () => {
        pairs.forEach((el) => { el.removeAttribute('style'); $$('.burst__frame--b, .burst__scan', el).forEach((x) => x.removeAttribute('style')); });
      };
    });
  }

  /* ═════════ Colecciones: índice con vista previa ═════════ */
  function initCollections() {
    const rows = $$('.coll__row');
    const prev = $('.coll__preview');
    if (!rows.length || !prev || !finePointer || reduce) return;
    const pvs = $$('.coll__pv', prev);
    gsap.set(prev, { xPercent: 0, scale: 0.86, rotation: -3, opacity: 0 });
    const px = gsap.quickTo(prev, 'x', { duration: 0.7, ease: 'power3' });
    const py = gsap.quickTo(prev, 'y', { duration: 0.7, ease: 'power3' });
    const list = $('.coll__list');
    list.addEventListener('pointermove', (e) => {
      const r = prev.getBoundingClientRect();
      const x = Math.min(e.clientX + 36, innerWidth - r.width - 20);
      px(x); py(e.clientY - r.height / 2);
    });
    rows.forEach((row) => {
      row.addEventListener('pointerenter', (e) => {
        pvs.forEach((p, k) => p.classList.toggle('is-on', k === Number(row.dataset.i)));
        if (parseFloat(gsap.getProperty(prev, 'opacity')) < 0.05) { gsap.set(prev, { x: e.clientX + 36, y: e.clientY - prev.offsetHeight / 2 }); }
        gsap.to(prev, { opacity: 1, scale: 1, rotation: 0, duration: 0.6, overwrite: 'auto' });
      });
    });
    list.addEventListener('pointerleave', () => gsap.to(prev, { opacity: 0, scale: 0.9, rotation: 2, duration: 0.4, overwrite: 'auto' }));
  }

  /* ═════════ Galería: filtros + FLIP ═════════ */
  const gallery = { items: [], apply: () => {} };
  function initGallery() {
    const grid = $('.gal__grid');
    const items = $$('.g-item', grid);
    gallery.items = items;
    const chips = $$('.chip');
    const countEl = $('.gal__n');
    let current = 'all';

    // fade-in de imágenes al cargar
    $$('.g-item__media img', grid).forEach((img) => {
      const done = () => img.classList.add('is-in');
      if (img.complete && img.naturalWidth) done(); else img.addEventListener('load', done, { once: true });
    });

    // revelado al entrar en pantalla: transiciones CSS + IntersectionObserver (casi sin costo con cientos de fotos)
    const medias = $$('.g-item__media', grid);
    if (!reduce && 'IntersectionObserver' in window) {
      medias.forEach((m) => m.classList.add('rv'));
      const io = new IntersectionObserver((entries) => {
        let k = 0;
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          e.target.style.transitionDelay = Math.min(k++, 8) * 70 + 'ms';
          e.target.classList.add('is-vis');
          io.unobserve(e.target);
        });
      }, { rootMargin: '0px 0px -6% 0px' });
      medias.forEach((m) => io.observe(m));
    }

    const inRange = (el) => { const r = el.getBoundingClientRect(); return r.bottom > -300 && r.top < innerHeight + 700; };

    function apply(key, { instant = false } = {}) {
      if (key === current && !instant) return;
      current = key;
      chips.forEach((c) => { const on = c.dataset.filter === key; c.classList.toggle('is-active', on); c.setAttribute('aria-pressed', String(on)); });
      const match = (it) => key === 'all' || it.dataset.groups.split(' ').includes(key);
      const nextVisible = items.filter(match);
      countEl.textContent = nextVisible.length;
      let state = null;
      if (!instant && !reduce) {
        // Flip solo con las fotos que se ven (o están por verse): animar cientos a la vez congela la página
        const now = items.filter((i) => !i.classList.contains('is-hidden') && inRange(i));
        const leaving = now.filter((i) => !match(i)).slice(0, 40);
        const staying = now.filter(match).slice(0, 60);
        const entering = nextVisible.filter((i) => i.classList.contains('is-hidden')).slice(0, 40);
        state = Flip.getState([...leaving, ...staying, ...entering]);
      }
      items.forEach((it) => it.classList.toggle('is-hidden', !match(it)));
      if (!state) { ScrollTrigger.refresh(); return; }
      Flip.from(state, {
        duration: 0.8, ease: 'power3.inOut', absolute: true, nested: false,
        onEnter: (els) => gsap.fromTo(els, { opacity: 0, scale: 0.85 }, { opacity: 1, scale: 1, duration: 0.6, delay: 0.2 }),
        onLeave: (els) => gsap.to(els, { opacity: 0, scale: 0.85, duration: 0.4 }),
        onComplete: () => ScrollTrigger.refresh(),
      });
    }
    gallery.apply = apply;

    chips.forEach((c) => c.addEventListener('click', () => apply(c.dataset.filter)));
    $$('a[data-filter]').forEach((a) => a.addEventListener('click', (e) => {
      e.preventDefault();
      apply(a.dataset.filter);
      scrollToTarget('#galeria', { offset: -20 });
    }));
  }

  /* ═════════ Visor ═════════ */
  function initLightbox() {
    const lb = $('.lb'), img = $('.lb__img'), bg = $('.lb__bg');
    const closeBtn = $('.lb__close'), prevBtn = $('.lb__prev'), nextBtn = $('.lb__next');
    const cTitle = $('.lb__title'), cSp = $('.lb__sp'), cMeta = $('.lb__meta'), cCount = $('.lb__count');
    let list = [], cur = -1, token = 0, opener = null, open = false, busy = false;
    const visible = () => gallery.items.filter((i) => !i.classList.contains('is-hidden'));

    function fill(fig) {
      const t = $('img', fig);
      img.alt = t.alt;
      img.setAttribute('width', t.getAttribute('width')); img.setAttribute('height', t.getAttribute('height'));
      img.removeAttribute('srcset');
      img.src = t.currentSrc || t.src;
      cTitle.textContent = fig.dataset.title;
      cSp.innerHTML = fig.dataset.common + (fig.dataset.latin ? ' · <i></i>' : '');
      if (fig.dataset.latin) $('i', cSp).textContent = fig.dataset.latin;
      cMeta.textContent = fig.dataset.meta;
      cCount.textContent = String(cur + 1).padStart(2, '0') + ' / ' + String(list.length).padStart(2, '0');
      lb.style.setProperty('--lb', fig.dataset.color || '#1b241c');
      // versión grande en segundo plano
      const my = ++token, hi = new Image();
      hi.sizes = '92vw'; hi.srcset = t.srcset;
      hi.onload = () => { if (my === token) img.src = hi.currentSrc || hi.src; };
      hi.src = t.currentSrc || t.src;
    }
    const rectOf = (el) => el.getBoundingClientRect();

    async function show(figure, fromRect) {
      list = visible(); cur = list.indexOf(figure);
      if (cur < 0) { list = gallery.items; cur = list.indexOf(figure); }
      open = true; busy = true;
      lb.classList.add('is-open'); lb.setAttribute('aria-hidden', 'false');
      lockScroll();
      fill(figure);
      gsap.fromTo(bg, { opacity: 0 }, { opacity: 1, duration: 0.6 });
      gsap.fromTo('.lb__close,.lb__nav,.lb__cap', { opacity: 0 }, { opacity: 1, duration: 0.6, delay: 0.3 });
      gsap.fromTo('.lb__cap > *', { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, stagger: 0.06, delay: 0.35 });
      try { await img.decode(); } catch (e) { /* ignore */ }
      const r1 = rectOf(img);
      if (fromRect && fromRect.width > 0 && r1.width > 0 && !reduce) {
        const s = fromRect.width / r1.width;
        gsap.fromTo(img, { x: fromRect.left + fromRect.width / 2 - (r1.left + r1.width / 2), y: fromRect.top + fromRect.height / 2 - (r1.top + r1.height / 2), scale: s, opacity: 1 },
          { x: 0, y: 0, scale: 1, duration: 1, ease: 'power4.out', onComplete: () => { busy = false; } });
      } else {
        gsap.fromTo(img, { opacity: 0, scale: 0.96 }, { opacity: 1, scale: 1, duration: 0.6, onComplete: () => { busy = false; } });
      }
      closeBtn.focus({ preventScroll: true });
    }

    function hide() {
      if (!open) return;
      open = false; busy = true;
      const fig = list[cur];
      const tile = fig && $('img', fig);
      let r = tile ? rectOf(tile) : null;
      const onScreen = r && r.bottom > 0 && r.top < innerHeight && r.width > 0 && !fig.classList.contains('is-hidden');
      const done = () => {
        lb.classList.remove('is-open'); lb.setAttribute('aria-hidden', 'true');
        gsap.set(img, { clearProps: 'all' }); unlockScroll(); busy = false;
        if (opener && opener.focus) opener.focus({ preventScroll: true });
      };
      gsap.to('.lb__close,.lb__nav,.lb__cap', { opacity: 0, duration: 0.25 });
      if (onScreen && !reduce) {
        const r1 = rectOf(img);
        const s = r.width / r1.width;
        gsap.to(img, { x: r.left + r.width / 2 - (r1.left + r1.width / 2), y: r.top + r.height / 2 - (r1.top + r1.height / 2), scale: s, duration: 0.8, ease: 'power4.inOut' });
        gsap.to(bg, { opacity: 0, duration: 0.6, delay: 0.2, onComplete: done });
      } else {
        gsap.to([img, bg], { opacity: 0, duration: 0.4, onComplete: done });
      }
    }

    function step(dir) {
      if (!open || busy || list.length < 2) return;
      busy = true;
      const next = (cur + dir + list.length) % list.length;
      gsap.to(img, {
        x: -70 * dir, opacity: 0, duration: 0.3, ease: 'power2.in',
        onComplete: async () => {
          cur = next; fill(list[cur]);
          try { await img.decode(); } catch (e) { /* ignore */ }
          gsap.fromTo(img, { x: 70 * dir, opacity: 0, scale: 1 }, { x: 0, opacity: 1, duration: 0.7, onComplete: () => { busy = false; } });
          gsap.fromTo('.lb__cap > *', { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, stagger: 0.05 });
        },
      });
    }

    // aperturas
    document.addEventListener('click', (e) => {
      const tile = e.target.closest('.g-item__btn');
      if (tile) { opener = tile; show(tile.parentElement, rectOf($('img', tile))); return; }
      const ext = e.target.closest('[data-lb]');
      if (ext) {
        const fig = gallery.items.find((i) => i.dataset.id === ext.dataset.lb);
        if (!fig) return;
        opener = ext;
        const from = $('.sel__media', ext) ? rectOf($('.sel__media', ext)) : rectOf(ext);
        if (fig.classList.contains('is-hidden')) gallery.apply('all', { instant: true });
        show(fig, from);
      }
    });
    closeBtn.addEventListener('click', hide);
    prevBtn.addEventListener('click', () => step(-1));
    nextBtn.addEventListener('click', () => step(1));
    bg.addEventListener('click', hide);
    $('.lb__stage').addEventListener('click', (e) => { if (e.target === e.currentTarget) hide(); });

    document.addEventListener('keydown', (e) => {
      if (!open) return;
      if (e.key === 'Escape') hide();
      else if (e.key === 'ArrowRight') step(1);
      else if (e.key === 'ArrowLeft') step(-1);
      else if (e.key === 'Tab') {
        const f = [closeBtn, prevBtn, nextBtn];
        const i = f.indexOf(document.activeElement);
        e.preventDefault();
        f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
      }
    });

    // gestos táctiles
    let sx = 0, sy = 0, tracking = false;
    lb.addEventListener('pointerdown', (e) => { if (e.pointerType === 'mouse') return; tracking = true; sx = e.clientX; sy = e.clientY; });
    lb.addEventListener('pointerup', (e) => {
      if (!tracking) return; tracking = false;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) step(dx < 0 ? 1 : -1);
      else if (dy > 100) hide();
    });
  }

  /* ═════════ Arranque ═════════ */
  window.scrollTo(0, 0);
  safe('cursor', initCursor);
  safe('hero', initHero);
  safe('marquee', initMarquee);
  safe('humming', initHumming);
  safe('intro', initIntro);
  safe('gallery', initGallery);
  safe('collections', initCollections);
  safe('select', initSelect);
  safe('burst', initBurst);
  safe('reveals', initReveals);
  safe('nav', initNav);
  safe('magnetic', initMagnetic);
  safe('lightbox', initLightbox);
  safe('loader', runLoader);

  window.addEventListener('load', () => ScrollTrigger.refresh());
})();
