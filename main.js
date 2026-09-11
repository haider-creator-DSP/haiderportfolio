/* =====================================================================
   Ali Haider Azam — Portfolio engine
   Everything that moves lives here. Project content lives in data.js
   (window.PROJECTS) so adding a project never means touching this file.

   Modules (in order): helpers · theme · loader · smooth scroll · nav ·
   cursor & magnetic · hero wall + kinetic type · text splitting & reveals ·
   counters · gallery (tiles, filters, tilt, auto-pan) · case viewer ·
   play section (pinned) · live demos (order flow, sunrise, rubber arm,
   radio, type-checker, leaner) · principles pipeline · contact · boot
   ===================================================================== */
(() => {
  'use strict';

  /* ---------- helpers ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const P = window.PROJECTS || [];
  const byId = Object.fromEntries(P.map(p => [p.id, p]));
  const store = {
    get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} },
  };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  /** Calls cb(isVisible) whenever el enters/leaves the viewport. */
  const watch = (el, cb, opts = { threshold: 0.12 }) => {
    const io = new IntersectionObserver(es => es.forEach(e => cb(e.isIntersecting, e)), opts);
    io.observe(el);
    return io;
  };
  const pointer = { x: innerWidth / 2, y: innerHeight / 2, moved: false };
  addEventListener('pointermove', e => { pointer.x = e.clientX; pointer.y = e.clientY; pointer.moved = true; }, { passive: true });

  /* ---------- theme (with circular reveal where supported) ---------- */
  function theme() {
    const btn = $('#themeBtn');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const next = root.dataset.theme === 'light' ? 'dark' : 'light';
      const apply = () => {
        root.dataset.theme = next;
        store.set('theme', next);
        const m = $('meta[name="theme-color"]');
        if (m) m.content = next === 'light' ? '#F1ECE3' : '#0A0908';
      };
      if (!document.startViewTransition || reduced) return apply();
      const r = btn.getBoundingClientRect();
      const x = r.left + r.width / 2, y = r.top + r.height / 2;
      const end = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
      const vt = document.startViewTransition(apply);
      vt.ready.then(() => root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${end}px at ${x}px ${y}px)`] },
        { duration: 850, easing: 'cubic-bezier(.76,0,.24,1)', pseudoElement: '::view-transition-new(root)' }
      ));
    });
  }

  /* ---------- loader: counts up while the hero wall images load ---------- */
  function loader() {
    const L = $('#loader');
    const done = () => root.classList.add('is-ready');
    if (!L) { done(); return Promise.resolve(); }
    const name = $('#loaderName');
    name.innerHTML = [...name.textContent].map((c, i) =>
      `<span style="--i:${i}"${i >= 10 ? ' class="serif"' : ''}>${c === ' ' ? '&nbsp;' : c}</span>`).join('');
    if (reduced) { L.remove(); done(); return Promise.resolve(); }
    const count = $('#loaderCount'), bar = $('#loaderBar');
    const imgs = $$('.wall img').slice(0, 14);
    let loaded = 0;
    const total = Math.max(1, imgs.length);
    imgs.forEach(im => {
      if (im.complete) loaded++;
      else { const f = () => loaded++; im.addEventListener('load', f, { once: true }); im.addEventListener('error', f, { once: true }); }
    });
    return new Promise(res => {
      const t0 = performance.now();
      let shown = 0, finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        count.textContent = '100';
        bar.style.width = '100%';
        setTimeout(() => { L.classList.add('is-done'); done(); res(); setTimeout(() => L.remove(), 1200); }, 180);
      };
      // Animation frames pause in background tabs, so a plain timer guarantees the reveal.
      setTimeout(finish, 3600);
      const tick = now => {
        if (finished) return;
        let target = Math.min((loaded / total) * 100, ((now - t0) / 1500) * 100);
        if (now - t0 > 3200) target = 100;
        shown += (target - shown) * 0.12;
        if (target - shown < 0.5) shown = target;
        count.textContent = String(Math.floor(shown)).padStart(2, '0');
        bar.style.width = shown + '%';
        if (shown >= 100) finish();
        else requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }

  /* ---------- smooth scroll (Lenis) wired to GSAP ScrollTrigger ---------- */
  let lenis = null;
  function smooth() {
    const hasGsap = window.gsap && window.ScrollTrigger;
    if (hasGsap) gsap.registerPlugin(ScrollTrigger);
    if (window.Lenis && fine && !reduced) {
      lenis = new Lenis({ duration: 1.15, easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
      if (hasGsap) {
        lenis.on('scroll', ScrollTrigger.update);
        gsap.ticker.add(t => lenis.raf(t * 1000));
        gsap.ticker.lagSmoothing(0);
      } else {
        const raf = t => { lenis.raf(t); requestAnimationFrame(raf); };
        requestAnimationFrame(raf);
      }
    }
    // In-page anchors glide instead of jumping.
    $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      const t = $(id);
      if (!t) return;
      e.preventDefault();
      root.classList.remove('menu-open');
      if (lenis) lenis.scrollTo(t, { offset: id === '#top' ? 0 : -70, duration: 1.6 });
      else t.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
    }));
  }
  const lockScroll = on => {
    if (lenis) on ? lenis.stop() : lenis.start();
    document.body.style.overflow = on ? 'hidden' : '';
  };

  /* ---------- nav: hide on scroll down, active-section pill, clock, menu ---------- */
  function nav() {
    const navEl = $('#nav'), prog = $('#progress');
    let lastY = scrollY;
    const onScroll = () => {
      const y = scrollY;
      navEl.classList.toggle('is-scrolled', y > 30);
      if (!root.classList.contains('menu-open')) {
        if (y > lastY + 6 && y > 500) navEl.classList.add('is-hidden');
        else if (y < lastY - 6) navEl.classList.remove('is-hidden');
      }
      lastY = y;
      const max = document.documentElement.scrollHeight - innerHeight;
      prog.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
    };
    addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // sliding pill behind the active link
    const links = $$('.nav__links a');
    const pill = document.createElement('span');
    pill.className = 'nav__pill';
    $('.nav__links')?.appendChild(pill);
    const movePill = a => {
      if (!a) { pill.style.opacity = 0; return; }
      pill.style.opacity = 1;
      pill.style.left = a.offsetLeft + 'px';
      pill.style.width = a.offsetWidth + 'px';
    };
    links.forEach(a => {
      a.addEventListener('mouseenter', () => movePill(a));
      a.addEventListener('mouseleave', () => movePill($('.nav__links a.is-active')));
    });
    const secs = links.map(a => $(a.getAttribute('href'))).filter(Boolean);
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      links.forEach(a => a.classList.toggle('is-active', a.getAttribute('href') === '#' + e.target.id));
      movePill($('.nav__links a.is-active'));
    }), { rootMargin: '-45% 0px -50% 0px' });
    secs.forEach(s => io.observe(s));

    // Gujranwala local time
    const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Karachi', hour: '2-digit', minute: '2-digit' });
    const clock = () => $$('[data-clock]').forEach(el => { el.textContent = fmt.format(new Date()); });
    clock();
    setInterval(clock, 15000);

    // mobile menu
    const mb = $('#menuBtn'), menu = $('#menu');
    mb?.addEventListener('click', () => {
      const open = !root.classList.contains('menu-open');
      root.classList.toggle('menu-open', open);
      mb.setAttribute('aria-expanded', open);
      menu.setAttribute('aria-hidden', !open);
      lockScroll(open);
      if (!open) return;
      navEl.classList.remove('is-hidden');
    });
    $$('.menu a').forEach(a => a.addEventListener('click', () => {
      root.classList.remove('menu-open');
      mb.setAttribute('aria-expanded', 'false');
      lockScroll(false);
    }));
  }

  /* ---------- cursor, magnetic buttons, ambient light ---------- */
  function cursor() {
    const c = $('#cursor'), label = $('#cursorLabel'), amb = $('.ambient');
    let cx = pointer.x, cy = pointer.y, ax = innerWidth * 0.7, ay = innerHeight * 0.2;
    // Only transforms are written (GPU, no repaint), and only while something is still moving.
    const loop = () => {
      if (c && fine && Math.abs(pointer.x - cx) + Math.abs(pointer.y - cy) > 0.3) {
        cx = lerp(cx, pointer.x, 0.22);
        cy = lerp(cy, pointer.y, 0.22);
        c.style.transform = `translate3d(${cx.toFixed(1)}px,${cy.toFixed(1)}px,0)`;
      }
      // ambient glow drifts toward the pointer
      if (amb && fine && Math.abs(pointer.x - ax) + Math.abs(pointer.y - ay) > 1) {
        ax = lerp(ax, pointer.x, 0.04);
        ay = lerp(ay, pointer.y, 0.04);
        amb.style.transform = `translate3d(${ax.toFixed(0)}px,${ay.toFixed(0)}px,0)`;
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    if (!fine || !c) return;
    addEventListener('pointermove', () => c.classList.add('is-on'), { once: true });
    document.addEventListener('pointerover', e => {
      const lab = e.target.closest('[data-cursor]');
      const link = e.target.closest('a,button,[role="button"],.chip');
      c.classList.toggle('is-label', !!lab);
      c.classList.toggle('is-link', !lab && !!link);
      label.textContent = lab ? lab.dataset.cursor : '';
    });
    document.addEventListener('pointerleave', () => c.classList.remove('is-on'));
    document.addEventListener('pointerenter', () => c.classList.add('is-on'));
  }
  function magnetic() {
    if (!fine || reduced) return;
    $$('[data-magnetic]').forEach(el => {
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        el.style.transform = `translate(${dx * 0.28}px,${dy * 0.38}px)`;
      });
      el.addEventListener('pointerleave', () => {
        el.style.transition = 'transform .7s cubic-bezier(.16,1,.3,1)';
        el.style.transform = '';
        setTimeout(() => (el.style.transition = ''), 700);
      });
    });
  }

  /* ---------- hero: drifting 3D wall of real screenshots ---------- */
  function wall() {
    const w = $('#wall');
    if (!w) return;
    const thumbs = window.WALL || P.filter(p => p.thumb).flatMap(p => [].concat(p.thumb));
    if (!thumbs.length) return;
    const cols = innerWidth < 640 ? 3 : 6;
    const perCol = 4;
    for (let c = 0; c < cols; c++) {
      const col = document.createElement('div');
      col.className = 'wall__col';
      col.style.setProperty('--dur', 70 + (c % 3) * 18 + 's');
      const list = [];
      // walk the list with a stride so neighbours differ and every column gets a fresh mix
      for (let i = 0; i < perCol; i++) list.push(thumbs[(c + i * cols) % thumbs.length]);
      const html = list.map(src => `<div class="wall__item"><img src="${src}" alt="" decoding="async"></div>`).join('');
      col.innerHTML = html + html; // duplicated so the loop is seamless
      w.appendChild(col);
    }
    // parallax with the pointer + melt away while scrolling
    const content = $('.hero__content');
    let wx = 0, wy = 0;
    let heroVisible = true;
    watch($('.hero'), v => (heroVisible = v), { threshold: 0 });
    let lastKey = '';
    const loop = () => {
      if (heroVisible) {
        const tx = fine ? (pointer.x / innerWidth - 0.5) * -60 : 0;
        const ty = fine ? (pointer.y / innerHeight - 0.5) * -40 : 0;
        wx = lerp(wx, tx, 0.05);
        wy = lerp(wy, ty, 0.05);
        const p = clamp(scrollY / innerHeight, 0, 1);
        const key = `${wx.toFixed(0)}|${wy.toFixed(0)}|${p.toFixed(3)}`;
        if (key !== lastKey) { // skip all style writes when nothing moved
          lastKey = key;
          w.style.setProperty('--wx', wx.toFixed(1) + 'px');
          w.style.setProperty('--wy', (wy + p * 160).toFixed(1) + 'px');
          if (p > 0 && root.classList.contains('is-ready')) w.style.opacity = (1 - p * 0.85).toFixed(3);
          if (content) content.style.transform = `translate3d(0,${(p * -90).toFixed(1)}px,0)`;
        }
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  /* ---------- kinetic type: letters swell toward the cursor ---------- */
  function kinetic() {
    const groups = $$('.kin');
    groups.forEach(el => {
      el.innerHTML = [...el.textContent].map(c => `<span>${c === ' ' ? '&nbsp;' : esc(c)}</span>`).join('');
    });
    const chars = $$('.kin span');
    // Touch screens get static type: a constant weight wave re-lays out the headline every frame.
    if (!chars.length || reduced || !fine) return;
    const vis = new Set();
    groups.forEach(g => watch(g, v => (v ? vis.add(g) : vis.delete(g)), { threshold: 0 }));
    // Measure each letter's centre once (page coordinates); re-measure only when layout really changes.
    let centres = [];
    const measure = () => {
      centres = chars.map(ch => {
        const r = ch.getBoundingClientRect();
        return { x: r.left + r.width / 2 + scrollX, y: r.top + r.height / 2 + scrollY };
      });
    };
    measure();
    addEventListener('resize', measure);
    document.fonts?.ready.then(measure);
    setTimeout(measure, 5200); // after the loader and the hero words have risen
    const cur = chars.map(() => 500);
    let lastX = -1, lastY = -1, settle = 0;
    const loop = () => {
      if (vis.size) {
        const px = pointer.x + scrollX, py = pointer.y + scrollY;
        if (px !== lastX || py !== lastY) { lastX = px; lastY = py; settle = 45; }
        if (settle > 0) { // only work while the pointer moves (plus a short ease-out)
          settle--;
          chars.forEach((ch, i) => {
            if (!vis.has(ch.parentElement)) return;
            const c = centres[i];
            const k = clamp(1 - Math.hypot(px - c.x, py - c.y) / 340, 0, 1);
            const next = lerp(cur[i], 380 + 420 * k * k, 0.25);
            if (Math.abs(next - cur[i]) > 4) { cur[i] = next; ch.style.setProperty('--wg', next.toFixed(0)); }
          });
        }
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  /* ---------- split headings into letters + scroll reveals ---------- */
  function splitText(el) {
    let i = 0;
    const walk = (src, dst) => {
      src.childNodes.forEach(n => {
        if (n.nodeType === 3) {
          n.textContent.split(/(\s+)/).forEach(tok => {
            if (!tok) return;
            if (/^\s+$/.test(tok)) { dst.appendChild(document.createTextNode(' ')); return; }
            const wd = document.createElement('span');
            wd.className = 'wd';
            [...tok].forEach(c => {
              const s = document.createElement('span');
              s.className = 'ch';
              s.style.setProperty('--i', i++);
              s.textContent = c;
              wd.appendChild(s);
            });
            dst.appendChild(wd);
          });
        } else if (n.nodeType === 1) {
          const c = n.cloneNode(false);
          walk(n, c);
          dst.appendChild(c);
        }
      });
    };
    const holder = document.createElement('div');
    walk(el, holder);
    el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    el.replaceChildren(...holder.childNodes);
    [...el.children].forEach(c => c.setAttribute('aria-hidden', 'true'));
    el.classList.add('split');
  }
  function reveals() {
    $$('[data-split]').forEach(splitText);
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in');
      io.unobserve(e.target);
    }), { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    $$('[data-reveal],[data-split]').forEach(el => io.observe(el));
  }

  /* ---------- counters ---------- */
  function counters() {
    $$('[data-count]').forEach(el => {
      const n = +el.dataset.count;
      watch(el, v => {
        if (!v || el.dataset.done) return;
        el.dataset.done = 1;
        const t0 = performance.now(), dur = 1800;
        const step = now => {
          const k = clamp((now - t0) / dur, 0, 1);
          el.textContent = Math.round(n * (1 - Math.pow(2, -10 * k)));
          if (k < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
    });
  }

  /* ---------- gallery ---------- */
  const CATS = [
    ['all', 'Everything'], ['app', 'Apps'], ['store', 'Stores'], ['web', 'Websites'],
    ['dash', 'Dashboards'], ['tool', 'Tools & AI'], ['lab', 'Experiments'],
  ];
  const bar = url => `<div class="bar"><i></i><i></i><i></i><span class="url">${esc(url || '')}</span></div>`;
  const browser = (src, url, cls = '') =>
    `<div class="frame frame--browser ${cls}">${bar(url)}<div class="view"><img class="pan" src="${src}" alt="" loading="lazy" decoding="async"></div></div>`;
  const phone = (src, cls = '', pan = true) =>
    `<div class="frame frame--phone ${cls}"><div class="view"><img${pan ? ' class="pan"' : ''} src="${src}" alt="" loading="lazy" decoding="async"></div></div>`;
  const stars = n => Array.from({ length: n }, (_, i) =>
    `<i style="--i:${i};left:${(Math.random() * 100).toFixed(1)}%;top:${(Math.random() * 70).toFixed(1)}%;opacity:${(0.3 + Math.random() * 0.7).toFixed(2)}"></i>`).join('');

  // Tiles use small copies (assets/tiles/); the case viewer keeps the full-size screenshots.
  const small = s => s && s.replace('assets/shots/', 'assets/tiles/');
  function cover(p) {
    const c = p.cover || {};
    switch (c.type) {
      case 'browser': return browser(small(c.d), p.url) + (c.m ? phone(small(c.m)) : '');
      case 'phones': return `<div class="fanned">${c.phones.map(s => phone(s, '', false)).join('')}</div>`;
      case 'phone': return phone(small(c.m), 'solo');
      case 'video': return `<div class="frame frame--browser frame--video">${bar(p.url)}<div class="view"><video muted loop playsinline preload="none" poster="${c.poster}" src="${c.video}"></video></div></div>`;
      case 'sky': return `<div class="mini-sky"><div class="stars">${stars(40)}</div><div class="sun"></div><div class="word">2 a.m. → 9 a.m.</div></div>`;
      case 'gum': return `<canvas class="gum-canvas" aria-label="Rubber arm toy — drag the fist"></canvas>`;
      default: return `<div class="type-cover"><b>${esc(c.title || p.name)}</b><span>${esc(c.sub || '')}</span></div>`;
    }
  }

  function tileHTML(p, i) {
    const size = { wide: 'tile--wide', half: 'tile--half', full: 'tile--full' }[p.size] || '';
    const tag = (p.live ? '<span class="live">Live</span>' : '') + (p.wip ? '<span>In progress</span>' : '') + `<span>${esc(p.kind)}</span>`;
    return `<article class="tile ${size}" tabindex="0" role="button" data-id="${p.id}" data-cats="${p.cats.join(' ')}"
        aria-label="${esc(p.name)} — open case study" style="--c:${p.color}" data-cursor="${p.cover?.type === 'gum' ? 'Pull' : 'Open'}" data-reveal>
      <div class="tile__stage">
        <div class="tile__tag">${tag}</div>
        <span class="tile__open" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M7 17L17 7M8 7h9v9"/></svg></span>
        ${cover(p)}
        <div class="tile__glare"></div>
      </div>
      <div class="tile__meta">
        <div><h3>${esc(p.name)} <span class="arrow">↗</span></h3><p>${esc(p.tagline)}</p>
          ${p.chips ? `<div class="tile__chips">${p.chips.map(c => `<span>${esc(c)}</span>`).join('')}</div>` : ''}</div>
        <span class="mono">${String(i + 1).padStart(2, '0')}</span>
      </div>
    </article>`;
  }

  /** Sets how far a tall screenshot should glide inside its frame. */
  function setPan(img) {
    const view = img.parentElement;
    const fit = () => {
      if (!img.naturalWidth) return;
      const h = (img.naturalHeight / img.naturalWidth) * view.clientWidth;
      const pan = Math.min(0, view.clientHeight - h);
      img.style.setProperty('--pan', pan.toFixed(0) + 'px');
      img.style.setProperty('--pd', Math.max(9, -pan / 55).toFixed(1) + 's');
    };
    if (img.complete) fit();
    img.addEventListener('load', fit); // refit whenever the picture is swapped
    new ResizeObserver(fit).observe(view);
  }

  function gallery() {
    const grid = $('#grid'), filters = $('#filters');
    if (!grid) return;
    grid.innerHTML = P.map(tileHTML).join('');
    $('#workCount') && ($('#workCount').textContent = `(${String(P.length).padStart(2, '0')})`);

    // filters with live counts and a sliding pill
    filters.innerHTML = CATS.map(([k, label]) => {
      const n = k === 'all' ? P.length : P.filter(p => p.cats.includes(k)).length;
      return n ? `<button class="chip${k === 'all' ? ' is-on' : ''}" data-cat="${k}" aria-pressed="${k === 'all'}">${label}<sup>${n}</sup></button>` : '';
    }).join('') + '<span class="filters__pill" aria-hidden="true"></span>';
    const pill = $('.filters__pill', filters);
    const movePill = btn => Object.assign(pill.style, {
      left: btn.offsetLeft + 'px', top: btn.offsetTop + 'px', width: btn.offsetWidth + 'px', height: btn.offsetHeight + 'px',
    });
    requestAnimationFrame(() => movePill($('.chip.is-on', filters)));
    addEventListener('resize', () => movePill($('.chip.is-on', filters)));

    filters.addEventListener('click', e => {
      const btn = e.target.closest('.chip');
      if (!btn) return;
      $$('.chip', filters).forEach(b => { b.classList.toggle('is-on', b === btn); b.setAttribute('aria-pressed', b === btn); });
      movePill(btn);
      const cat = btn.dataset.cat;
      const tiles = $$('.tile', grid);
      const before = new Map(tiles.filter(t => !t.classList.contains('is-hidden')).map(t => [t, t.getBoundingClientRect()]));
      tiles.forEach(t => t.classList.toggle('is-hidden', cat !== 'all' && !t.dataset.cats.split(' ').includes(cat)));
      // FLIP: glide every visible tile from its old spot to its new one
      tiles.filter(t => !t.classList.contains('is-hidden')).forEach((t, i) => {
        t.classList.add('is-in');
        const b = before.get(t), a = t.getBoundingClientRect();
        if (reduced) return;
        if (b) {
          t.animate([{ transform: `translate(${b.left - a.left}px,${b.top - a.top}px)` }, { transform: 'none' }],
            { duration: 800, easing: 'cubic-bezier(.16,1,.3,1)' });
        } else {
          t.animate([{ opacity: 0, transform: 'translateY(40px) scale(.96)' }, { opacity: 1, transform: 'none' }],
            { duration: 800, delay: i * 40, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'backwards' });
        }
      });
      if (window.ScrollTrigger) setTimeout(() => ScrollTrigger.refresh(), 850);
    });

    // Speed: a moving screenshot is the most expensive thing on the page (a huge GPU layer on
    // Retina screens), so at most MAX_LIVE tiles move at once — the hovered tile plus the most
    // visible ones. Measured: all visible tiles moving = 41 fps on an M2; two at a time = smooth.
    const MAX_LIVE = 2;
    const ratios = new Map();
    let hovered = null;
    const setLive = (t, on) => {
      if (t.classList.contains('is-live') === on) return;
      t.classList.toggle('is-live', on);
      const v = t.querySelector('video');
      if (v) on ? v.play().catch(() => {}) : v.pause();
    };
    const refreshLive = () => {
      const ranked = [...ratios.entries()].filter(([, r]) => r > 0.35).sort((a, b) => b[1] - a[1]).map(([t]) => t);
      const live = new Set(hovered ? [hovered] : []);
      for (const t of ranked) { if (live.size >= MAX_LIVE) break; live.add(t); }
      $$('.tile', grid).forEach(t => setLive(t, live.has(t)));
    };
    const liveIO = new IntersectionObserver(es => {
      es.forEach(e => { ratios.set(e.target, e.intersectionRatio); e.target._setVis?.(e.isIntersecting); });
      refreshLive();
    }, { threshold: [0, 0.2, 0.35, 0.5, 0.75, 1] });

    // per-tile behaviour
    $$('.tile', grid).forEach(tile => {
      const p = byId[tile.dataset.id];
      const stage = $('.tile__stage', tile);
      $$('img.pan', tile).forEach(setPan);
      const video = $('video', tile);
      const mini = $('.mini-sky', tile);
      let tileVisible = false;
      tile._setVis = v => (tileVisible = v);
      liveIO.observe(tile);
      // Phones can't hover, so the Sober Review tile runs its sunrise on its own.
      if (mini && !fine && !reduced) setInterval(() => { if (tileVisible) mini.classList.toggle('is-day'); }, 3200);
      const gum = $('.gum-canvas', tile);
      if (gum) Gum(gum, { mini: true });

      if (fine && !reduced) {
        stage.addEventListener('pointermove', e => {
          const r = stage.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
          stage.style.setProperty('--ry', ((px - 0.5) * 9).toFixed(2) + 'deg');
          stage.style.setProperty('--rx', ((0.5 - py) * 7).toFixed(2) + 'deg');
          stage.style.setProperty('--gx', (px * 100).toFixed(1) + '%');
          stage.style.setProperty('--gy', (py * 100).toFixed(1) + '%');
        });
        stage.addEventListener('pointerleave', () => { stage.style.setProperty('--rx', '0deg'); stage.style.setProperty('--ry', '0deg'); });
      }
      tile.addEventListener('pointerenter', () => {
        root.style.setProperty('--ambient', p.color);
        hovered = tile;
        refreshLive();
      });
      tile.addEventListener('pointerleave', () => { if (hovered === tile) { hovered = null; refreshLive(); } });
      tile.addEventListener('click', e => {
        if (e.target.closest('.gum-canvas')) return; // the arm is a toy, not a link
        openCase(p.id, tile);
      });
      tile.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openCase(p.id, tile); } });
    });
  }

  /* ---------- case viewer ---------- */
  let current = null, lastTile = null;
  function caseMedia(p) {
    const g = p.gallery || [];
    const out = [];
    let phones = [];
    const flushPhones = () => {
      if (!phones.length) return;
      out.push(`<div class="case__phones">${phones.join('')}</div>`);
      phones = [];
    };
    g.forEach((m, i) => {
      const d = `style="transition-delay:${(0.25 + i * 0.08).toFixed(2)}s"`;
      if (m.t === 'm') { phones.push(`<figure class="shot" ${d}><img src="${m.src}" alt="${esc(p.name)} on mobile" loading="lazy"></figure>`); return; }
      flushPhones();
      if (m.t === 'd') out.push(`<figure class="shot" ${d}><div class="bar"><i></i><i></i><i></i><span>${esc(m.label || p.url || '')}</span></div><img src="${m.src}" alt="${esc(p.name)} — ${esc(m.label || 'screen')}" loading="lazy"></figure>`);
      if (m.t === 'video') out.push(`<figure class="shot" ${d}><div class="bar"><i></i><i></i><i></i><span>${esc(m.label || '')}</span></div><video src="${m.src}" poster="${m.poster || ''}" muted loop playsinline autoplay></video></figure>`);
      if (m.t === 'scene') out.push(`<figure class="shot shot--scene" ${d}>${m.html}</figure>`);
    });
    flushPhones();
    return out.join('');
  }
  function openCase(id, fromEl) {
    const p = byId[id];
    const c = $('#case');
    if (!p || !c) return;
    current = p;
    lastTile = fromEl || $(`.tile[data-id="${id}"]`);
    const list = visibleIds();
    const idx = list.indexOf(id);
    const prev = byId[list[(idx - 1 + list.length) % list.length]];
    const next = byId[list[(idx + 1) % list.length]];
    c.style.setProperty('--c', p.color);
    $('.case__info', c).innerHTML = `
      <div class="case__top"><span class="case__num mono">${String(P.indexOf(p) + 1).padStart(2, '0')} / ${String(P.length).padStart(2, '0')}</span>
        <button class="case__close" type="button" aria-label="Close case study">✕</button></div>
      <span class="case__cat mono">${esc(p.kind)}${p.year ? ' · ' + p.year : ''}</span>
      <h2 class="case__title" id="caseTitle">${esc(p.name)}</h2>
      <p class="case__lead">${esc(p.lead || p.tagline)}</p>
      ${p.stats ? `<div class="case__stats">${p.stats.map(([n, l]) => `<div><b>${esc(n)}</b><span>${esc(l)}</span></div>`).join('')}</div>` : ''}
      ${p.features ? `<p class="mono case__h">What’s inside</p><div class="case__feats">${p.features.map(([t, d]) => `<div><b>${esc(t)}</b><p>${esc(d)}</p></div>`).join('')}</div>` : ''}
      ${p.facts ? `<ul class="case__facts">${p.facts.map(f => `<li><span>${f}</span></li>`).join('')}</ul>` : ''}
      <ul class="tags">${(p.stack || []).map(s => `<li>${esc(s)}</li>`).join('')}</ul>
      <div class="case__links">${p.link ? `<a class="btn btn--accent btn--sm" href="${p.link.href}" target="_blank" rel="noopener">${esc(p.link.label)} ↗</a>` : ''}</div>
      <div class="case__pager">
        <button type="button" data-go="${prev.id}"><small>← Previous</small>${esc(prev.name)}</button>
        <button type="button" data-go="${next.id}" style="text-align:right"><small>Next →</small>${esc(next.name)}</button>
      </div>`;
    const media = $('.case__media', c);
    $('.case__media-inner', c).innerHTML = caseMedia(p);
    media.scrollTop = 0;
    $('.case__info', c).scrollTop = 0;
    $$('.case__media video', c).forEach(v => v.play().catch(() => {}));
    $$('.case__media .sky', c).forEach(initSky);
    $$('.case__media canvas.gum-canvas', c).forEach(cv => Gum(cv, {}));

    const panel = $('.case__panel', c);
    if (!c.classList.contains('is-open')) {
      // grow the panel out of the tile the visitor clicked
      const from = (lastTile && $('.tile__stage', lastTile) || lastTile)?.getBoundingClientRect();
      if (from && !reduced) {
        const pr = { left: 0, top: 0, right: innerWidth, bottom: innerHeight };
        panel.style.transition = 'none';
        panel.style.setProperty('--ct', Math.max(0, from.top - pr.top) + 'px');
        panel.style.setProperty('--cl', Math.max(0, from.left - pr.left) + 'px');
        panel.style.setProperty('--cr', Math.max(0, pr.right - from.right) + 'px');
        panel.style.setProperty('--cb', Math.max(0, pr.bottom - from.bottom) + 'px');
        panel.offsetWidth; // commit the start state before animating
        panel.style.transition = '';
      }
      c.classList.add('is-open');
      c.setAttribute('aria-hidden', 'false');
      lockScroll(true);
    }
    history.replaceState(null, '', '#/' + id);
    $('.case__close', c).focus({ preventScroll: true });
    $('.case__close', c).addEventListener('click', closeCase);
    $$('[data-go]', c).forEach(b => b.addEventListener('click', () => swapCase(b.dataset.go)));
  }
  function swapCase(id) {
    const c = $('#case');
    const inner = $('.case__media-inner', c), info = $('.case__info', c);
    if (reduced) return openCase(id);
    const outs = [inner, info].map(el => el.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-20px)' }], { duration: 260, easing: 'ease-in', fill: 'forwards' }));
    setTimeout(() => {
      openCase(id);
      outs.forEach(a => a.cancel()); // a finished 'forwards' animation would otherwise keep them invisible
      [inner, info].forEach(el => el.animate([{ opacity: 0, transform: 'translateY(24px)' }, { opacity: 1, transform: 'none' }], { duration: 600, easing: 'cubic-bezier(.16,1,.3,1)' }));
    }, 260);
  }
  function closeCase() {
    const c = $('#case');
    if (!c.classList.contains('is-open')) return;
    const panel = $('.case__panel', c);
    const tile = $(`.tile[data-id="${current?.id}"]`);
    const r = tile && !tile.classList.contains('is-hidden') ? $('.tile__stage', tile).getBoundingClientRect() : null;
    if (r && r.bottom > 0 && r.top < innerHeight) {
      panel.style.setProperty('--ct', r.top + 'px');
      panel.style.setProperty('--cl', r.left + 'px');
      panel.style.setProperty('--cr', innerWidth - r.right + 'px');
      panel.style.setProperty('--cb', innerHeight - r.bottom + 'px');
    } else {
      ['--ct', '--cl', '--cr', '--cb'].forEach(k => panel.style.setProperty(k, '40%'));
    }
    c.classList.remove('is-open');
    c.setAttribute('aria-hidden', 'true');
    lockScroll(false);
    history.replaceState(null, '', location.pathname + location.search);
    $$('.case__media video', c).forEach(v => v.pause());
    (tile || lastTile)?.focus({ preventScroll: true });
    current = null;
  }
  const visibleIds = () => $$('.tile:not(.is-hidden)').map(t => t.dataset.id);
  function caseKeys() {
    addEventListener('keydown', e => {
      if (!current) return;
      if (e.key === 'Escape') closeCase();
      const list = visibleIds(), i = list.indexOf(current.id);
      if (e.key === 'ArrowRight') swapCase(list[(i + 1) % list.length]);
      if (e.key === 'ArrowLeft') swapCase(list[(i - 1 + list.length) % list.length]);
    });
    $('#case .case__bg')?.addEventListener('click', closeCase);
    const m = location.hash.match(/^#\/([\w-]+)/);
    if (m && byId[m[1]]) setTimeout(() => openCase(m[1]), 600);
  }

  /* ---------- play section: vertical scroll drives a horizontal track ---------- */
  function play() {
    const pin = $('#playPin'), track = $('#playTrack');
    if (!pin || !track) return;
    const counter = $('#playNow');
    const panels = $$('.panel', track);
    panels.forEach((p, i) => watch(p, v => { if (v && counter) counter.textContent = String(i + 1).padStart(2, '0'); }, { threshold: 0.6 }));
    if (!(window.gsap && window.ScrollTrigger) || innerWidth <= 640 || reduced) {
      $('.play').classList.add('play--native');
      return;
    }
    const dist = () => Math.max(0, track.scrollWidth - innerWidth);
    gsap.to(track, {
      x: () => -dist(), ease: 'none',
      scrollTrigger: {
        trigger: pin, start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 0.9, invalidateOnRefresh: true,
        onUpdate: s => $('#playBar') && ($('#playBar').style.transform = `scaleX(${s.progress})`),
      },
    });
    // each panel leans slightly as it travels, like cards on a rail
    panels.forEach(pn => gsap.fromTo(pn, { rotateY: -8, scale: 0.94 }, {
      rotateY: 0, scale: 1, ease: 'none',
      scrollTrigger: { trigger: pn, containerAnimation: gsap.getTweensOf(track)[0], start: 'left 100%', end: 'left 35%', scrub: true },
    }));
  }

  /* ---------- demo 1: Pakiza order → dashboard ---------- */
  function flow() {
    const stage = $('#flowStage');
    if (!stage) return;
    const holder = stage.parentElement;
    const fit = () => {
      const s = Math.min(1, (holder.clientWidth - 24) / 560, (holder.clientHeight - 24) / 440);
      stage.style.transform = `scale(${Math.max(0.4, s)})`;
    };
    new ResizeObserver(fit).observe(holder);
    fit();

    const carts = [
      [['Daal Masoor 500g', 115, 2, '#E07A3A'], ['Green Tea 100g', 360, 1, '#6FA35B'], ['Basmati Rice 1kg', 450, 1, '#E9D7A8']],
      [['Fresh Milk 1L', 220, 3, '#DCE7F0'], ['Desi Eggs ×12', 420, 1, '#E9C58A'], ['Roohi Mirch 200g', 290, 2, '#C8452F']],
      [['Cooking Oil 5L', 2650, 1, '#F2C94C'], ['Atta 10kg', 1180, 1, '#D9C4A0']],
      [['Tea & Kehwah', 540, 1, '#7A4B2A'], ['Biscuits family', 180, 3, '#E7A64B'], ['Sugar 1kg', 165, 2, '#F4F0E6']],
    ];
    const names = ['Ayesha K.', 'Bilal A.', 'Sana M.', 'Usman T.', 'Hira S.', 'Zain R.', 'Mahnoor F.', 'Hamza J.'];
    const riders = ['Kashif', 'Imran', 'Waqas', 'Adeel'];
    const fmt = n => 'Rs ' + n.toLocaleString('en-US');
    const rows = $('#dashRows'), items = $('#phItems');
    const seed = [['PM-5005', 'Ali R.', 660, 'ok', 'Delivered'], ['PM-5004', 'Fatima N.', 2180, 'out', 'Out for delivery'], ['PM-5003', 'Omer S.', 940, 'ok', 'Delivered']];
    const rowHTML = (id, who, amt, st, label, isNew) =>
      `<div class="row${isNew ? ' is-new' : ''}"><span class="mono">${id}</span><span>${who}</span><span>${fmt(amt)}</span><span class="st st--${st}">${label}</span></div>`;
    rows.innerHTML = seed.map(r => rowHTML(...r)).join('');

    const path = $('#wireBase'), glow = $('#wireGlow'), packet = $('#packet');
    const len = path.getTotalLength();
    glow.style.strokeDasharray = `0 ${len}`;
    let n = 5006, k = 0, bells = 0, visible = false, running = false;
    watch(holder, v => { visible = v; if (v) run(); }, { threshold: 0.3 });

    const travel = () => new Promise(res => {
      const t0 = performance.now(), dur = 1150;
      packet.style.opacity = 1;
      const step = now => {
        const t = clamp((now - t0) / dur, 0, 1);
        const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        const pt = path.getPointAtLength(len * e);
        packet.style.transform = `translate(${pt.x - 28}px,${pt.y - 12}px)`;
        glow.style.strokeDasharray = `${len * e} ${len}`;
        if (t < 1) requestAnimationFrame(step);
        else { packet.style.opacity = 0; res(); }
      };
      requestAnimationFrame(step);
    });

    async function cycle() {
      const cart = carts[k++ % carts.length];
      const sub = cart.reduce((s, [, p, q]) => s + p * q, 0);
      const fee = sub >= 1500 ? 0 : 200;
      const total = sub + fee;
      const id = 'PM-' + n++;
      $('#phDone').classList.remove('is-on');
      items.innerHTML = cart.map(([nm, p, q, c], i) =>
        `<li style="--i:${i}"><i style="--c:${c}"></i><div><b>${nm}</b><small>${fmt(p)} × ${q}</small></div><em>${fmt(p * q)}</em></li>`).join('');
      $('#phCount').textContent = cart.length + ' items';
      $('#phFee').textContent = fee ? fmt(fee) : 'Free';
      $('#phTotal').textContent = fmt(total);
      $('#phOrderNo').textContent = id;
      $('#packetNo').textContent = id;
      glow.style.strokeDasharray = `0 ${len}`;
      await sleep(1300);
      $('#phBtn').classList.add('is-press');
      await sleep(180);
      $('#phBtn').classList.remove('is-press');
      $('#phDone').classList.add('is-on');
      await sleep(350);
      await travel();
      const bell = $('#bell');
      bells++;
      $('#bellCount').textContent = bells;
      bell.classList.add('has');
      bell.classList.remove('ring'); bell.offsetWidth; bell.classList.add('ring');
      const who = names[(n + k) % names.length];
      rows.insertAdjacentHTML('afterbegin', rowHTML(id, who, total, 'new', 'Pending', true));
      while (rows.children.length > 4) rows.lastElementChild.remove();
      $('#toastNo').textContent = id;
      $('#toastAmt').textContent = fmt(total);
      $('#toast').classList.add('is-on');
      await sleep(1500);
      const st = rows.firstElementChild?.querySelector('.st');
      if (st) { st.className = 'st st--out'; st.textContent = 'Rider: ' + riders[n % riders.length]; }
      rows.firstElementChild?.classList.remove('is-new');
      await sleep(1300);
      $('#toast').classList.remove('is-on');
      await sleep(900);
    }
    async function run() {
      if (running || reduced) return;
      running = true;
      while (visible) await cycle();
      running = false;
    }
    if (reduced) { // static final state
      items.innerHTML = carts[0].map(([nm, p, q, c], i) => `<li style="--i:${i}"><i style="--c:${c}"></i><div><b>${nm}</b><small>${fmt(p)} × ${q}</small></div><em>${fmt(p * q)}</em></li>`).join('');
    }
  }

  /* ---------- demo 2: Sober Review sunrise ---------- */
  function initSky(sky) {
    if (sky.dataset.ready) return;
    sky.dataset.ready = 1;
    const st = $('.sky__stars', sky);
    if (st) st.innerHTML = Array.from({ length: 90 }, (_, i) => {
      const s = (Math.random() * 2 + 0.6).toFixed(1);
      return `<i style="left:${(Math.random() * 100).toFixed(1)}%;top:${(Math.random() * 72).toFixed(1)}%;width:${s}px;height:${s}px;animation-delay:${(-Math.random() * 3).toFixed(2)}s"></i>`;
    }).join('');
    const time = $('.sky__time', sky);
    let touched = 0, visible = false;
    const set = day => {
      sky.classList.toggle('is-day', day);
      if (time) time.textContent = day ? '09:02 — Morning. Judge it sober.' : '02:14 — Night. Record the genius.';
    };
    set(false);
    sky.addEventListener('click', () => { touched = Date.now(); set(!sky.classList.contains('is-day')); });
    const btn = $('#sunBtn');
    if (btn && sky.id === 'sky') btn.addEventListener('click', () => { touched = Date.now(); set(!sky.classList.contains('is-day')); });
    watch(sky, v => (visible = v), { threshold: 0.3 });
    setInterval(() => { if (visible && !reduced && Date.now() - touched > 9000) set(!sky.classList.contains('is-day')); }, 4200);
  }

  /* ---------- demo 3: Gum-Gum rubber arm (spring physics on canvas) ---------- */
  function Gum(canvas, { mini = false } = {}) {
    if (canvas.dataset.ready) return;
    canvas.dataset.ready = 1;
    const ctx = canvas.getContext('2d');
    const meter = canvas.parentElement.querySelector('.gum-meter');
    let W = 0, H = 0, A = { x: 0, y: 0 }, rest = { x: 0, y: 0 };
    const hand = { x: 0, y: 0, vx: 0, vy: 0 };
    let target = null, dragging = false, demo = false, lastTouch = 0, t = 0, visible = false;
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(2, devicePixelRatio || 1);
      W = r.width; H = r.height;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      A = { x: W * 0.16, y: H * 0.64 };
      rest = { x: A.x + Math.min(W * 0.16, 130), y: A.y - H * 0.04 };
      if (!hand.x) { hand.x = rest.x; hand.y = rest.y; }
    };
    new ResizeObserver(resize).observe(canvas);
    resize();
    const pos = e => { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    canvas.addEventListener('pointerdown', e => {
      dragging = true; demo = false; lastTouch = Date.now();
      target = pos(e); canvas.setPointerCapture(e.pointerId);
      e.stopPropagation();
    });
    canvas.addEventListener('pointermove', e => { if (dragging) { target = pos(e); lastTouch = Date.now(); } });
    const up = () => { dragging = false; lastTouch = Date.now(); };
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    watch(canvas, v => { visible = v; if (v) requestAnimationFrame(loop); }, { threshold: 0 });

    // idle auto-demo: grab, stretch somewhere, let go
    let demoT = 0;
    const autoDemo = async () => {
      while (true) {
        await sleep(2600);
        if (!visible || dragging || Date.now() - lastTouch < 4000 || reduced) continue;
        demo = true;
        const goal = { x: W * (0.62 + Math.random() * 0.3), y: H * (0.15 + Math.random() * 0.6) };
        target = { x: hand.x, y: hand.y };
        demoT = performance.now();
        while (performance.now() - demoT < 850 && demo) {
          const k = (performance.now() - demoT) / 850;
          target = { x: lerp(hand.x, goal.x, k * k), y: lerp(hand.y, goal.y, k * k) };
          await sleep(16);
        }
        await sleep(350);
        demo = false;
      }
    };
    autoDemo();

    const SKIN = '#F4C8A0', SKIN_D = '#D99C70', LINE = '#1A0E08', SLEEVE = '#E23B2E';
    function draw() {
      ctx.clearRect(0, 0, W, H);
      const dx = hand.x - A.x, dy = hand.y - A.y;
      const len = Math.max(1, Math.hypot(dx, dy));
      const restLen = Math.hypot(rest.x - A.x, rest.y - A.y);
      const nx = -dy / len, ny = dx / len;
      const speed = Math.hypot(hand.vx, hand.vy);
      const wob = Math.sin(t * 0.45) * Math.min(46, speed * 2.4);
      const cx = (A.x + hand.x) / 2 + nx * wob, cy = (A.y + hand.y) / 2 + ny * wob;
      const scale = mini ? 0.8 : 1;
      const width = clamp(34 * Math.sqrt(restLen / len), 9, 34) * scale;
      // speed lines
      if (speed > 7) {
        ctx.strokeStyle = 'rgba(255,255,255,.35)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 5; i++) {
          const o = (i - 2) * 10;
          ctx.beginPath();
          ctx.moveTo(hand.x - hand.vx * 2.4 + nx * o, hand.y - hand.vy * 2.4 + ny * o);
          ctx.lineTo(hand.x - hand.vx * 5 + nx * o, hand.y - hand.vy * 5 + ny * o);
          ctx.stroke();
        }
      }
      // arm: outline, skin, highlight
      const stroke = (w, col) => {
        ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.quadraticCurveTo(cx, cy, hand.x, hand.y);
        ctx.lineWidth = w; ctx.strokeStyle = col; ctx.lineCap = 'round'; ctx.stroke();
      };
      stroke(width + 6, LINE);
      stroke(width, SKIN);
      ctx.save(); ctx.translate(nx * -width * 0.22, ny * -width * 0.22); stroke(width * 0.22, 'rgba(255,255,255,.35)'); ctx.restore();
      // sleeve at the shoulder
      ctx.beginPath(); ctx.arc(A.x, A.y, 36 * scale, 0, Math.PI * 2);
      ctx.fillStyle = SLEEVE; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = LINE; ctx.stroke();
      ctx.beginPath(); ctx.arc(A.x - 30 * scale, A.y + 26 * scale, 58 * scale, 0, Math.PI * 2);
      ctx.fillStyle = SLEEVE; ctx.fill(); ctx.stroke();
      // fist, facing along the arm's end tangent
      const ang = Math.atan2(hand.y - cy, hand.x - cx);
      ctx.save(); ctx.translate(hand.x, hand.y); ctx.rotate(ang); ctx.scale(scale, scale);
      ctx.fillStyle = SKIN; ctx.strokeStyle = LINE; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.roundRect(-18, -24, 46, 48, 16); ctx.fill(); ctx.stroke();
      ctx.lineWidth = 2.5; ctx.strokeStyle = SKIN_D;
      for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(16, i * 12 - 4); ctx.lineTo(26, i * 12 - 4); ctx.stroke(); }
      ctx.fillStyle = SKIN; ctx.strokeStyle = LINE; ctx.lineWidth = 3.5;
      ctx.beginPath(); ctx.roundRect(-8, 10, 24, 16, 8); ctx.fill(); ctx.stroke();
      ctx.restore();
      if (meter) meter.textContent = `stretch ${(len / restLen).toFixed(1)}×`;
    }
    function loop() {
      if (!visible) return;
      t++;
      const grabbing = dragging || demo;
      const tgt = grabbing && target ? target : rest;
      const k = grabbing ? 0.22 : 0.085, damp = grabbing ? 0.6 : 0.86;
      hand.vx = (hand.vx + (tgt.x - hand.x) * k) * damp;
      hand.vy = (hand.vy + (tgt.y - hand.y) * k) * damp;
      hand.x += hand.vx; hand.y += hand.vy;
      draw();
      requestAnimationFrame(loop);
    }
  }

  /* ---------- demo 4: walkie-talkie push-to-talk ---------- */
  function radio() {
    const r = $('#radio');
    if (!r) return;
    const btn = $('.ptt', r), peers = $$('.peer', r), bars = $$('.radio__meter i', r);
    let talking = false, raf = 0, last = 0;
    const meter = () => {
      bars.forEach((b, i) => { b.style.height = talking ? (15 + Math.random() * 85 * (1 - Math.abs(i - bars.length / 2) / bars.length)) + '%' : '12%'; });
      if (talking) raf = setTimeout(meter, 90);
    };
    const set = on => {
      talking = on;
      r.classList.toggle('is-talking', on);
      btn.setAttribute('aria-pressed', on);
      $('#pttLabel').textContent = on ? 'Talking…' : 'Hold to talk';
      clearTimeout(raf); meter();
      peers.forEach((p, i) => setTimeout(() => p.classList.toggle('is-hearing', talking), on ? 180 + i * 110 : 0));
    };
    btn.addEventListener('pointerdown', e => { btn.setPointerCapture(e.pointerId); last = Date.now(); set(true); });
    ['pointerup', 'pointercancel'].forEach(ev => btn.addEventListener(ev, () => set(false)));
    btn.addEventListener('keydown', e => { if ((e.key === ' ' || e.key === 'Enter') && !talking) { e.preventDefault(); last = Date.now(); set(true); } });
    btn.addEventListener('keyup', e => { if (e.key === ' ' || e.key === 'Enter') set(false); });
    let visible = false;
    watch(r, v => (visible = v), { threshold: 0.4 });
    setInterval(async () => {
      if (!visible || talking || reduced || Date.now() - last < 7000) return;
      set(true); await sleep(1900); if (Date.now() - last >= 7000) set(false);
    }, 5200);
  }

  /* ---------- demo 5: Veloura type-checker (typewriter lines) ---------- */
  function typer() {
    const pre = $('#typer');
    if (!pre) return;
    const lines = $$('.line', pre);
    lines.forEach(l => {
      const n = Math.max(1, l.textContent.length);
      l.style.setProperty('--n', n);
      l.style.setProperty('--t', Math.min(1.4, n * 0.028).toFixed(2) + 's');
    });
    let visible = false, running = false;
    watch(pre, v => { visible = v; if (v) run(); }, { threshold: 0.35 });
    async function run() {
      if (running) return;
      running = true;
      while (visible) {
        // wipe instantly (no reverse typing), then type again
        lines.forEach(l => { l.style.transition = 'none'; l.classList.remove('is-typed'); });
        pre.offsetWidth;
        lines.forEach(l => (l.style.transition = ''));
        await sleep(500);
        for (const l of lines) {
          l.classList.add('is-typed');
          await sleep(parseFloat(l.style.getPropertyValue('--t')) * 1000 + (l.dataset.pause ? +l.dataset.pause : 120));
          if (!visible) break;
        }
        await sleep(4200);
      }
      running = false;
    }
    if (reduced) lines.forEach(l => l.classList.add('is-typed'));
  }

  /* ---------- demo 6: leaner flags bloat and deletes it ---------- */
  function leaner() {
    const box = $('#lean');
    if (!box) return;
    const lines = $$('.ln:not(#leanFixed)', box), score = $('#leanScore'), fixed = $('#leanFixed');
    let visible = false, running = false;
    watch(box, v => { visible = v; if (v) run(); }, { threshold: 0.35 });
    async function run() {
      if (running || reduced) return;
      running = true;
      while (visible) {
        lines.forEach(l => l.classList.remove('flag', 'gone'));
        fixed.classList.add('gone');
        score.innerHTML = `bloat: <b style="color:#C2411C">scanning…</b>`;
        await sleep(1400);
        const bad = lines.filter(l => l.dataset.why);
        for (const l of bad) { l.classList.add('flag'); await sleep(620); }
        score.innerHTML = `bloat: <b style="color:#C2411C">${bad.length} issues</b>`;
        await sleep(1500);
        for (const l of lines) { if (l.dataset.cut) { l.classList.add('gone'); await sleep(160); } }
        fixed.classList.remove('gone');
        score.innerHTML = `${lines.length} lines → <b>1</b> · same behaviour`;
        await sleep(4200);
      }
      running = false;
    }
  }

  /* ---------- dashboards: 19-theme switcher + every screen ---------- */
  function dashboard() {
    const D = window.DASH, view = $('#dshView'), dock = $('#dshThemes'), pagesEl = $('#dshPages');
    if (!D || !view || !dock) return;
    const sec = $('#dashboards'), pathEl = $('#dshPath'), nameEl = $('#dshThemeName');
    let idx = 3, touched = 0, visible = false, first = true;

    dock.innerHTML = D.themes.map((t, i) =>
      `<button type="button" role="radio" aria-checked="false" data-i="${i}" style="--tc:${t.color}"><span aria-hidden="true">${t.icon}</span>${esc(t.label)}</button>`).join('');
    pagesEl.innerHTML = D.pages.map((p, i) =>
      `<button type="button" class="pg" data-p="${i}"><span class="pg__img"><img src="${p.thumb}" alt="" loading="lazy" decoding="async"></span><span class="pg__label">${esc(p.label)}</span></button>`).join('');

    // Show a screenshot: the new one is revealed with a circular wipe from (x, y), then the old one is dropped.
    const show = (src, x, y) => {
      const img = new Image();
      img.className = 'dsh__img';
      img.alt = '';
      img.decoding = 'async';
      img.src = src;
      const put = () => {
        view.appendChild(img);
        if (img.naturalHeight / img.naturalWidth > view.clientHeight / view.clientWidth + 0.04) { img.classList.add('pan'); setPan(img); }
        if (first || reduced) { first = false; img.classList.add('is-in'); }
        else {
          img.style.setProperty('--x', x + 'px');
          img.style.setProperty('--y', y + 'px');
          img.classList.add('is-entering');
          requestAnimationFrame(() => requestAnimationFrame(() => img.classList.add('is-in')));
        }
        setTimeout(() => [...view.children].forEach(c => { if (c !== img) c.remove(); }), 1050);
      };
      img.decode ? img.decode().then(put, put) : (img.onload = put);
    };
    const origin = el => {
      const r = view.getBoundingClientRect();
      if (!el) return [r.width / 2, r.height / 2];
      const b = el.getBoundingClientRect();
      return [clamp(b.left + b.width / 2 - r.left, 0, r.width), clamp(b.top - r.top, 0, r.height)];
    };
    const setTheme = (i, el) => {
      idx = i;
      const t = D.themes[i];
      $$('button', dock).forEach((b, j) => { b.classList.toggle('is-on', j === i); b.setAttribute('aria-checked', j === i); });
      $$('.pg', pagesEl).forEach(b => b.classList.remove('is-on'));
      nameEl.textContent = t.label + ' theme';
      pathEl.textContent = 'dashboard';
      sec.style.setProperty('--dc', t.color);
      if (visible) root.style.setProperty('--ambient', t.color);
      show(t.src, ...origin(el));
      const b = dock.children[i];
      if (b) dock.scrollTo({ left: b.offsetLeft - dock.clientWidth / 2 + b.offsetWidth / 2, behavior: reduced ? 'auto' : 'smooth' });
    };
    dock.addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b) return;
      touched = Date.now();
      setTheme(+b.dataset.i, b);
    });
    pagesEl.addEventListener('click', e => {
      const b = e.target.closest('.pg');
      if (!b) return;
      touched = Date.now();
      const p = D.pages[+b.dataset.p];
      $$('.pg', pagesEl).forEach(x => x.classList.toggle('is-on', x === b));
      pathEl.textContent = p.path;
      nameEl.textContent = p.label;
      show(p.src, ...origin(null));
      const top = view.getBoundingClientRect().top;
      if (top < 60 || top > innerHeight * 0.5) {
        const y = top + scrollY - 120;
        lenis ? lenis.scrollTo(y, { duration: 1.2 }) : scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' });
      }
    });
    setTheme(idx);
    watch(sec, v => (visible = v), { threshold: 0.25 });
    // cycles through the themes by itself until someone picks one
    setInterval(() => {
      if (visible && !reduced && Date.now() - touched > 10000) setTheme((idx + 1) % D.themes.length);
    }, 3000);
  }

  /* ---------- live site slides: page tabs that swap the screenshots ---------- */
  function sites() {
    $$('.panel--site').forEach(pn => {
      const tabs = $$('.site__tabs button', pn), bimg = $('.site__browser img', pn), pimg = $('.site__phone img', pn), url = $('.site__browser .url', pn);
      [bimg, pimg].forEach(im => im && setPan(im));
      let i = 0, touched = 0, visible = false;
      const swap = (img, src) => {
        if (!img || !src || img.getAttribute('src') === src) return;
        img.classList.add('is-swapping');
        const pre = new Image();
        pre.src = src;
        const done = () => setTimeout(() => {
          img.src = src;
          const back = () => img.classList.remove('is-swapping');
          img.complete ? back() : img.addEventListener('load', back, { once: true });
        }, 250);
        pre.decode ? pre.decode().then(done, done) : (pre.onload = done);
      };
      const go = (k, user) => {
        i = k;
        if (user) touched = Date.now();
        tabs.forEach((t, j) => { t.classList.toggle('is-on', j === k); t.setAttribute('aria-selected', j === k); });
        const t = tabs[k];
        swap(bimg, t.dataset.d);
        if (t.dataset.m) swap(pimg, t.dataset.m);
        if (url && t.dataset.url) url.textContent = t.dataset.url;
      };
      tabs.forEach((t, k) => t.addEventListener('click', () => go(k, true)));
      watch(pn, v => { visible = v; pn.classList.toggle('is-live', v); }, { threshold: 0.35 });
      if (tabs.length > 1) setInterval(() => {
        if (visible && !reduced && Date.now() - touched > 12000) go((i + 1) % tabs.length);
      }, 6000);
    });
    // Order-flow slide has no screenshots, but mark it live too for consistency.
    $$('.panel:not(.panel--site)').forEach(pn => watch(pn, v => pn.classList.toggle('is-live', v), { threshold: 0.35 }));
    // Any button with data-open jumps straight into that project's case study.
    document.addEventListener('click', e => {
      const b = e.target.closest('[data-open]');
      if (b && byId[b.dataset.open]) openCase(b.dataset.open, $(`.tile[data-id="${b.dataset.open}"]`));
    });
  }

  /* ---------- principles: deploy pipeline lights up in order ---------- */
  function pipeline() {
    const steps = $$('.pipe span');
    if (!steps.length || reduced) return;
    let i = 0;
    setInterval(() => {
      steps.forEach((s, j) => s.classList.toggle('is-on', j <= i));
      i = (i + 1) % (steps.length + 2);
    }, 700);
  }

  /* ---------- contact: screenshots orbit the headline ---------- */
  function contact() {
    const c = $('.contact'), orbit = $('#orbit');
    if (!c || !orbit) return;
    const thumbs = P.filter(p => p.thumb).map(p => [].concat(p.thumb)[0]).slice(0, 8);
    const spots = [[6, 18], [80, 10], [88, 58], [4, 64], [22, 86], [70, 84], [40, 6], [58, 44]];
    orbit.innerHTML = thumbs.map((s, i) => `<img src="${s}" alt="" loading="lazy" style="left:${spots[i][0]}%;top:${spots[i][1]}%">`).join('');
    const imgs = $$('img', orbit);
    let vis = false;
    watch(c, v => { vis = v; c.classList.toggle('is-in', v); }, { threshold: 0.2 });
    let t = 0;
    const loop = () => {
      if (vis && !reduced) {
        t += 0.01;
        imgs.forEach((im, i) => {
          const px = (pointer.x / innerWidth - 0.5) * (20 + i * 6), py = (pointer.y / innerHeight - 0.5) * (20 + i * 6);
          im.style.transform = `translate3d(${px + Math.sin(t + i) * 10}px,${py + Math.cos(t * 1.3 + i) * 12}px,0) rotate(${Math.sin(t * 0.7 + i) * 6}deg)`;
        });
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    const copy = $('#copyBtn');
    copy?.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(copy.dataset.email); copy.textContent = 'Copied ✓'; }
      catch (e) { copy.textContent = copy.dataset.email; }
      setTimeout(() => (copy.textContent = 'Copy email'), 1800);
    });
  }

  /* ---------- boot ---------- */
  function boot() {
    theme();
    wall();
    smooth();
    nav();
    cursor();
    magnetic();
    kinetic();
    gallery(); // must run before reveals() so the tiles get observed
    reveals();
    counters();
    caseKeys();
    dashboard();
    sites();
    play();
    flow();
    $$('#sky').forEach(initSky);
    const g = $('#gumBig');
    if (g) Gum(g, {});
    radio();
    typer();
    leaner();
    pipeline();
    contact();
    loader().then(() => window.ScrollTrigger && ScrollTrigger.refresh());
    addEventListener('load', () => window.ScrollTrigger && ScrollTrigger.refresh());
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
