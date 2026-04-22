import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// ===================================
// NAVBAR
// ===================================
const navbar = document.getElementById('navbar');
const navToggle = document.getElementById('nav-toggle');
const navLinks = document.getElementById('nav-links');

window.addEventListener('scroll', () => {
  if (window.scrollY > 80) {
    navbar.classList.add('scrolled');
  } else {
    navbar.classList.remove('scrolled');
  }
});

// Mobile menu
const navClose = document.getElementById('nav-close');

navToggle?.addEventListener('click', () => {
  navToggle.classList.toggle('active');
  navLinks.classList.toggle('active');
});

navClose?.addEventListener('click', () => {
  navToggle.classList.remove('active');
  navLinks.classList.remove('active');
});

// Close mobile menu on link click
navLinks?.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    navToggle.classList.remove('active');
    navLinks.classList.remove('active');
  });
});

// ===================================
// STAFF "GAME OVER" ANNOUNCEMENT
// Staff long-press the header logo (~650ms) → plays Serbian voice-over
// through the site's audio output (venue speakers pipe from this).
// Short click still navigates to #hero as usual.
// ===================================
(() => {
  const logo = document.querySelector('.nav-logo');
  if (!logo) return;
  const audio = new Audio('/assets/audio/game-over.mp3');
  audio.preload = 'auto';
  let holdTimer = null;
  let longPressed = false;

  const HOLD_MS = 650;
  const flash = () => {
    logo.classList.add('game-over-flash');
    setTimeout(() => logo.classList.remove('game-over-flash'), 1400);
  };

  const startHold = (e) => {
    longPressed = false;
    clearTimeout(holdTimer);
    holdTimer = setTimeout(() => {
      longPressed = true;
      flash();
      try { audio.currentTime = 0; audio.play(); } catch {}
    }, HOLD_MS);
  };
  const cancelHold = () => { clearTimeout(holdTimer); };

  logo.addEventListener('mousedown',  startHold);
  logo.addEventListener('touchstart', startHold, { passive: true });
  logo.addEventListener('mouseup',    cancelHold);
  logo.addEventListener('mouseleave', cancelHold);
  logo.addEventListener('touchend',   cancelHold);
  logo.addEventListener('touchcancel', cancelHold);

  // If long-press fired, swallow the click so it doesn't also scroll to #hero.
  logo.addEventListener('click', (e) => {
    if (longPressed) {
      e.preventDefault();
      e.stopPropagation();
      longPressed = false;
    }
  });
})();

// ===================================
// PACKAGES TABS (Rođendani / Team Building / Individualni / Iznajmljivanje)
// ===================================
(() => {
  const tabs = Array.from(document.querySelectorAll('.pkg-tab'));
  const panels = Array.from(document.querySelectorAll('.pkg-panel'));
  if (!tabs.length || !panels.length) return;

  function activate(tabName, scrollToPackages = false) {
    tabs.forEach(t => {
      const on = t.dataset.tab === tabName;
      t.classList.toggle('is-active', on);
      t.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    panels.forEach(p => {
      const on = p.dataset.panel === tabName;
      p.classList.toggle('is-active', on);
      if (on) p.removeAttribute('hidden'); else p.setAttribute('hidden', '');
    });
    if (scrollToPackages) {
      document.getElementById('packages')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  tabs.forEach(t => t.addEventListener('click', () => activate(t.dataset.tab)));

  // Anchor deep-link: #individualna, #team-building, #iznajmljivanje pick the matching tab
  const anchorToTab = {
    'individualna':   'individual',
    'team-building':  'teambuild',
    'iznajmljivanje': 'venue',
    'packages':       'birthdays'
  };
  function applyHash() {
    const h = (location.hash || '').replace('#', '');
    if (anchorToTab[h]) activate(anchorToTab[h], h !== 'packages');
  }
  window.addEventListener('hashchange', applyHash);
  // Initial load
  applyHash();
})();

// Scroll-spy: highlight nav link for the section currently in view
(() => {
  const sectionLinks = Array.from(navLinks?.querySelectorAll('a[href^="#"]') || [])
    .filter(a => a.getAttribute('href').length > 1);
  if (!sectionLinks.length || !('IntersectionObserver' in window)) return;

  const byId = new Map();
  sectionLinks.forEach(a => {
    const id = a.getAttribute('href').slice(1);
    const sec = document.getElementById(id);
    if (sec) byId.set(id, a);
  });
  if (!byId.size) return;

  const visible = new Map();
  const setActive = (id) => {
    sectionLinks.forEach(a => a.classList.remove('is-active'));
    const link = byId.get(id);
    if (link) link.classList.add('is-active');
  };

  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) visible.set(e.target.id, e.intersectionRatio);
      else visible.delete(e.target.id);
    });
    if (!visible.size) return;
    // Pick the section with the largest visible ratio
    let best = null, bestRatio = -1;
    visible.forEach((ratio, id) => {
      if (ratio > bestRatio) { best = id; bestRatio = ratio; }
    });
    if (best) setActive(best);
  }, {
    rootMargin: '-30% 0px -55% 0px',
    threshold: [0, 0.25, 0.5, 0.75, 1]
  });

  byId.forEach((_link, id) => {
    const sec = document.getElementById(id);
    if (sec) io.observe(sec);
  });
})();

// ===================================
// TYPEWRITER EFFECT
// ===================================
class Typewriter {
  constructor(element, texts, speed = 60) {
    this.element = element;
    this.texts = texts;
    this.speed = speed;
    this.deleteSpeed = 30;
    this.pauseTime = 2000;
    this.currentText = 0;
    this.charIndex = 0;
    this.isDeleting = false;

    if (this.element) {
      this.element.innerHTML = '<span class="cursor-blink"></span>';
      this.type();
    }
  }

  type() {
    const current = this.texts[this.currentText];

    if (this.isDeleting) {
      this.charIndex--;
    } else {
      this.charIndex++;
    }

    this.element.innerHTML = current.substring(0, this.charIndex) + '<span class="cursor-blink"></span>';

    let timeout = this.isDeleting ? this.deleteSpeed : this.speed;

    if (!this.isDeleting && this.charIndex === current.length) {
      timeout = this.pauseTime;
      this.isDeleting = true;
    } else if (this.isDeleting && this.charIndex === 0) {
      this.isDeleting = false;
      this.currentText = (this.currentText + 1) % this.texts.length;
      timeout = 500;
    }

    setTimeout(() => this.type(), timeout);
  }
}

new Typewriter(document.getElementById('typewriter'), [
  'PARKING obezbeđen za SVE posetioce.',
  'Najmodernija laser tag arena u Beogradu.',
  'Pozovite nas: +381 64 525 7777',
]);

// ===================================
// COUNTER ANIMATION
// ===================================
function animateCounters() {
  const counters = document.querySelectorAll('[data-count]');

  counters.forEach(counter => {
    const target = parseInt(counter.dataset.count);

    ScrollTrigger.create({
      trigger: counter,
      start: 'top 90%',
      once: true,
      onEnter: () => {
        gsap.to(counter, {
          innerText: target,
          duration: 2,
          snap: { innerText: 1 },
          ease: 'power2.out'
        });
      }
    });
  });
}

animateCounters();

// ===================================
// GSAP SCROLL ANIMATIONS (using fromTo for reliability)
// ===================================

// Helper: scrollReveal with fromTo (never leaves elements invisible)
function scrollReveal(selector, fromVars, toVars, triggerOpts = {}) {
  const elements = gsap.utils.toArray(selector);
  if (!elements.length) return;

  elements.forEach((el, i) => {
    const delay = triggerOpts.staggerDelay ? i * triggerOpts.staggerDelay : 0;

    gsap.fromTo(el,
      { ...fromVars },
      {
        ...toVars,
        delay,
        scrollTrigger: {
          trigger: triggerOpts.trigger || el,
          start: triggerOpts.start || 'top 90%',
          once: true,
          ...triggerOpts.scrollTrigger
        }
      }
    );
  });
}

// --- Hero section (no scroll trigger, immediate on load) ---
gsap.fromTo('.hero-content',
  { opacity: 0, y: 60 },
  { opacity: 1, y: 0, duration: 1.2, delay: 0.3, ease: 'power3.out' }
);

gsap.fromTo('.hero-badge',
  { opacity: 0, y: -30 },
  { opacity: 1, y: 0, duration: 0.8, delay: 0.5, ease: 'power3.out' }
);

gsap.fromTo('.hero-title-line',
  { opacity: 0, y: 80 },
  { opacity: 1, y: 0, duration: 1, delay: 0.7, ease: 'power3.out' }
);

gsap.fromTo('.hero-title-sub',
  { opacity: 0, y: 40 },
  { opacity: 1, y: 0, duration: 0.8, delay: 1, ease: 'power3.out' }
);

gsap.fromTo('.hero-cta-group',
  { opacity: 0, y: 30 },
  { opacity: 1, y: 0, duration: 0.8, delay: 1.5, ease: 'power3.out' }
);

gsap.fromTo('.hero-stats',
  { opacity: 0, y: 20 },
  { opacity: 1, y: 0, duration: 0.8, delay: 1.8, ease: 'power3.out' }
);

gsap.fromTo('.scroll-indicator',
  { opacity: 0 },
  { opacity: 1, duration: 1, delay: 2, ease: 'power3.out' }
);

// --- About section ---
scrollReveal('.about-image-frame',
  { opacity: 0, x: -60 },
  { opacity: 1, x: 0, duration: 0.8, ease: 'power3.out' }
);

scrollReveal('.about-badges .about-badge',
  { opacity: 0, scale: 0.8 },
  { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(1.5)' },
  { staggerDelay: 0.15 }
);

scrollReveal('.about-content',
  { opacity: 0, x: 60 },
  { opacity: 1, x: 0, duration: 0.8, ease: 'power3.out' }
);

// --- Experience cards ---
scrollReveal('.exp-card',
  { opacity: 0, y: 60 },
  { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' },
  { staggerDelay: 0.15 }
);

// --- Package cards ---
scrollReveal('.package-card',
  { opacity: 0, y: 80 },
  { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' },
  { staggerDelay: 0.2 }
);

// --- Birthday cards ---
scrollReveal('.birthday-card',
  { opacity: 0, y: 60 },
  { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' },
  { staggerDelay: 0.3, trigger: '.birthday-grid' }
);

// --- Masonry gallery items ---
scrollReveal('.masonry-item',
  { opacity: 0, y: 40, scale: 0.92 },
  { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: 'back.out(1.3)' },
  { staggerDelay: 0.06, trigger: '.masonry', start: 'top 85%' }
);

// --- Contact section ---
scrollReveal('.contact-item',
  { opacity: 0, x: -60 },
  { opacity: 1, x: 0, duration: 0.6, ease: 'power3.out' },
  { staggerDelay: 0.2, trigger: '.contact-grid' }
);

scrollReveal('.map-wrapper',
  { opacity: 0, x: 60 },
  { opacity: 1, x: 0, duration: 0.8, ease: 'power3.out' }
);

// --- Section headers ---
scrollReveal('.section-header',
  { opacity: 0, y: 30 },
  { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }
);

// ===================================
// SAFETY FALLBACK — force-show after 3s
// ===================================
setTimeout(() => {
  const selectors = '.exp-card, .package-card, .birthday-card, .masonry-item, .contact-item, .about-image-frame, .about-content, .about-badge, .map-wrapper, .section-header';
  document.querySelectorAll(selectors).forEach(el => {
    const style = getComputedStyle(el);
    if (style.opacity === '0' || parseFloat(style.opacity) < 0.1) {
      gsap.set(el, { opacity: 1, y: 0, x: 0, scale: 1 });
    }
  });
}, 3000);

// ===================================
// 3D TILT EFFECT ON CARDS (desktop only)
// ===================================
if (!('ontouchstart' in window)) document.querySelectorAll('[data-tilt]').forEach(card => {
  card.addEventListener('mousemove', (e) => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = (y - centerY) / 15;
    const rotateY = (centerX - x) / 15;

    card.querySelector('.exp-card-inner').style.transform =
      `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-5px)`;
  });

  card.addEventListener('mouseleave', () => {
    card.querySelector('.exp-card-inner').style.transform =
      'perspective(1000px) rotateX(0) rotateY(0) translateY(0)';
  });
});

// ===================================
// RESERVATION BUTTONS — desktop scrolls to #contact, mobile dials
// ===================================
(() => {
  const RESERVE_PHONE = '+381645257777';
  // Match every tel: link pointing at the reservation number
  const links = document.querySelectorAll(`a[href="tel:${RESERVE_PHONE}"]`);
  if (!links.length) return;

  // 'fine' pointer + 'hover' capability = desktop with mouse
  const isDesktop = () =>
    window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
    window.innerWidth > 768;

  links.forEach(a => {
    a.addEventListener('click', (e) => {
      if (!isDesktop()) return; // mobile: let tel: dial open
      e.preventDefault();
      const contact = document.getElementById('contact');
      if (!contact) return;
      const offset = 80;
      const top = contact.getBoundingClientRect().top + window.pageYOffset - offset;
      window.scrollTo({ top, behavior: 'smooth' });
      // briefly highlight the phone link to draw attention
      const phoneLink = contact.querySelector('a.contact-link');
      if (phoneLink) {
        phoneLink.classList.add('contact-link-flash');
        setTimeout(() => phoneLink.classList.remove('contact-link-flash'), 2400);
      }
    });
  });
})();

// ===================================
// SMOOTH SCROLL
// ===================================
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      const headerOffset = 80;
      const elementPosition = target.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  });
});

// ===================================
// LASER SHOT EFFECT ON CLICK
// ===================================
document.addEventListener('click', (e) => {
  const shot = document.createElement('div');
  shot.style.cssText = `
    position: fixed;
    left: ${e.clientX}px;
    top: ${e.clientY}px;
    width: 4px;
    height: 4px;
    background: #ff0088;
    border-radius: 50%;
    pointer-events: none;
    z-index: 9999;
    box-shadow: 0 0 10px #ff0088, 0 0 20px #ff0088, 0 0 40px #ff0088;
  `;
  document.body.appendChild(shot);

  // Expand and fade
  gsap.to(shot, {
    width: 30,
    height: 30,
    opacity: 0,
    x: -13,
    y: -13,
    duration: 0.4,
    ease: 'power2.out',
    onComplete: () => shot.remove()
  });

  // Particle burst
  for (let i = 0; i < 6; i++) {
    const particle = document.createElement('div');
    const angle = (Math.PI * 2 / 6) * i;
    const distance = 30 + Math.random() * 20;

    particle.style.cssText = `
      position: fixed;
      left: ${e.clientX}px;
      top: ${e.clientY}px;
      width: 2px;
      height: 2px;
      background: ${['#ff0088', '#00f0ff', '#00ff88'][i % 3]};
      border-radius: 50%;
      pointer-events: none;
      z-index: 9999;
      box-shadow: 0 0 5px currentColor;
    `;
    document.body.appendChild(particle);

    gsap.to(particle, {
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
      opacity: 0,
      duration: 0.5,
      ease: 'power2.out',
      onComplete: () => particle.remove()
    });
  }
});

// ===================================
// HERO VIDEO PARALLAX (desktop only)
// ===================================
const heroVideoWrap = document.querySelector('.hero-video-wrap');
const heroSection = document.querySelector('.hero');
if (heroVideoWrap && heroSection && window.matchMedia('(min-width: 769px)').matches) {
  gsap.to(heroVideoWrap, {
    yPercent: 15,
    ease: 'none',
    scrollTrigger: {
      trigger: heroSection,
      start: 'top top',
      end: 'bottom top',
      scrub: true
    }
  });
}

// ===================================
// VIDEO PLAY/PAUSE ON VISIBILITY (perf + bandwidth)
// ===================================
(() => {
  const videos = document.querySelectorAll('.hero-video, .masonry-item-video video');
  if (!videos.length || !('IntersectionObserver' in window)) {
    videos.forEach(v => { v.play?.().catch(() => {}); });
    return;
  }

  const obs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const v = entry.target;
      if (entry.isIntersecting) {
        v.play?.().catch(() => {});
      } else {
        v.pause?.();
      }
    });
  }, { threshold: 0.2 });

  videos.forEach(v => obs.observe(v));
})();

// ===================================
// GALLERY MARQUEE — continuous rAF scroll (like reviews) + arrows
// ===================================
(() => {
  const masonry = document.getElementById('masonry');
  const track = document.getElementById('masonry-track');
  const prevBtn = document.getElementById('masonry-prev');
  const nextBtn = document.getElementById('masonry-next');
  if (!masonry || !track) return;

  const items = Array.from(track.querySelectorAll('.masonry-item'));
  if (!items.length) return;

  // Clone tiles for seamless infinite loop
  items.forEach(el => {
    const clone = el.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    clone.removeAttribute('data-animate');
    track.appendChild(clone);
  });

  let offset = 0;
  let halfWidth = 0;
  const speed = 0.4;
  let paused = false;
  let manualHoldUntil = 0;

  function measure() { halfWidth = track.scrollWidth / 2; }

  function applyOffset() {
    track.style.transform = `translate3d(${offset}px, 0, 0)`;
  }

  function tick(ts) {
    if (!paused && ts >= manualHoldUntil && !document.body.classList.contains('lightbox-open')) {
      track.classList.remove('snap');
      offset -= speed;
      if (offset <= -halfWidth) offset += halfWidth;
      applyOffset();
    }
    requestAnimationFrame(tick);
  }

  function jump(dir) {
    const card = track.querySelector('.masonry-item');
    if (!card) return;
    const step = card.offsetWidth + 16;
    track.classList.add('snap');
    offset += dir * step;
    if (offset > 0) offset -= halfWidth;
    if (offset <= -halfWidth) offset += halfWidth;
    applyOffset();
    manualHoldUntil = performance.now() + 4000;
  }

  masonry.addEventListener('mouseenter', () => { paused = true; });
  masonry.addEventListener('mouseleave', () => { paused = false; });
  masonry.addEventListener('touchstart', () => { paused = true; }, { passive: true });
  masonry.addEventListener('touchend', () => { setTimeout(() => { paused = false; }, 2000); });

  prevBtn?.addEventListener('click', () => jump(1));
  nextBtn?.addEventListener('click', () => jump(-1));

  requestAnimationFrame(() => { measure(); requestAnimationFrame(tick); });
  window.addEventListener('resize', measure);

  // ----- Category filter (Sve / Arena / Rođendani / Team Building / Prostor) --
  const filterBtns = document.querySelectorAll('.gallery-filter');
  if (filterBtns.length) {
    const allTiles = () => Array.from(track.querySelectorAll('.masonry-item'));
    const applyFilter = (cat) => {
      allTiles().forEach(tile => {
        const match = (cat === 'all') || (tile.dataset.category === cat);
        tile.classList.toggle('is-filtered-out', !match);
      });
      // Track width changed — reset offset so visible tiles start at left and
      // the seamless-loop math keeps working.
      offset = 0;
      applyOffset();
      requestAnimationFrame(measure);
    };
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => {
          b.classList.remove('is-active');
          b.setAttribute('aria-selected', 'false');
        });
        btn.classList.add('is-active');
        btn.setAttribute('aria-selected', 'true');
        applyFilter(btn.dataset.filter);
      });
    });
  }
})();

// ===================================
// REVIEWS (Google) — fetch + rAF-driven marquee + arrow nav
// ===================================
(async () => {
  const track = document.getElementById('reviews-track');
  const marquee = track?.parentElement;
  const prevBtn = document.getElementById('reviews-prev');
  const nextBtn = document.getElementById('reviews-next');
  if (!track || !marquee) return;

  const avgEl = document.getElementById('reviews-avg');
  const countEl = document.getElementById('reviews-count');
  const starsEl = document.getElementById('reviews-stars');
  const writeCta = document.getElementById('reviews-write-cta');
  const allLink = document.getElementById('reviews-all-link');

  const avatarColors = [
    'linear-gradient(135deg, #ff0088, #cc0033)',
    'linear-gradient(135deg, #00f0ff, #0077aa)',
    'linear-gradient(135deg, #00ff88, #008855)',
    'linear-gradient(135deg, #8b00ff, #5500aa)',
    'linear-gradient(135deg, #ff0088, #b3005a)',
  ];

  const initials = name => name.split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase();

  function starsMarkup(rating) {
    const full = Math.round(rating);
    let html = '';
    for (let i = 1; i <= 5; i++) {
      html += i <= full ? '★' : '<span class="star-empty">★</span>';
    }
    return html;
  }

  function renderCard(r, idx) {
    const card = document.createElement('article');
    card.className = 'review-card';
    card.innerHTML = `
      <div class="review-head">
        <div class="review-avatar" style="background:${avatarColors[idx % avatarColors.length]}">${initials(r.author)}</div>
        <div>
          <div class="review-author">${r.author}</div>
          <span class="review-stars" aria-label="${r.rating} od 5">${starsMarkup(r.rating)}</span>
        </div>
      </div>
      <p class="review-text">${r.text}</p>
      <div class="review-footer">
        <span class="review-date">${r.relativeTime}</span>
        <span class="review-source">
          <svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
          Google
        </span>
      </div>
    `;
    return card;
  }

  let data;
  try {
    const res = await fetch('/reviews.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error('http ' + res.status);
    data = await res.json();
  } catch (err) {
    track.innerHTML = '<div class="review-card" style="flex:0 0 100%; text-align:center; color:#888; padding:2rem">Recenzije trenutno nisu dostupne.</div>';
    console.warn('[reviews]', err);
    return;
  }

  if (avgEl) avgEl.textContent = data.averageRating.toFixed(1);
  if (countEl) countEl.textContent = data.totalReviews;
  if (starsEl) starsEl.innerHTML = starsMarkup(data.averageRating);
  if (data.writeReviewUrl && writeCta) writeCta.href = data.writeReviewUrl;
  if (data.mapsUrl && allLink) allLink.href = data.mapsUrl;

  // Render reviews twice for seamless loop
  const frag = document.createDocumentFragment();
  data.reviews.forEach((r, i) => frag.appendChild(renderCard(r, i)));
  data.reviews.forEach((r, i) => {
    const clone = renderCard(r, i);
    clone.setAttribute('aria-hidden', 'true');
    frag.appendChild(clone);
  });
  track.appendChild(frag);

  // rAF-driven auto-scroll
  let offset = 0;
  let halfWidth = 0;
  let speed = 0.35; // px per frame ~ 21 px/sec at 60fps
  let paused = false;
  let manualHoldUntil = 0;

  function measure() {
    // half = width of original (non-clone) set
    halfWidth = track.scrollWidth / 2;
  }

  function applyOffset() {
    track.style.transform = `translate3d(${offset}px, 0, 0)`;
  }

  function tick(ts) {
    if (!paused && ts >= manualHoldUntil) {
      track.classList.remove('snap');
      offset -= speed;
      if (offset <= -halfWidth) offset += halfWidth;
      applyOffset();
    }
    requestAnimationFrame(tick);
  }

  function jump(direction) {
    const card = track.querySelector('.review-card');
    if (!card) return;
    const step = card.offsetWidth + 20; // card + gap
    track.classList.add('snap');
    offset += direction * step;
    // normalize offset into [-halfWidth, 0]
    if (offset > 0) offset -= halfWidth;
    if (offset <= -halfWidth) offset += halfWidth;
    applyOffset();
    manualHoldUntil = performance.now() + 4000; // pause auto 4s
  }

  // pause on hover / touch
  marquee.addEventListener('mouseenter', () => { paused = true; });
  marquee.addEventListener('mouseleave', () => { paused = false; });
  marquee.addEventListener('touchstart', () => { paused = true; }, { passive: true });
  marquee.addEventListener('touchend',   () => { setTimeout(() => { paused = false; }, 2000); });

  prevBtn?.addEventListener('click', () => jump(1));  // move content right => show previous
  nextBtn?.addEventListener('click', () => jump(-1)); // move content left => show next

  // initial measurement (wait a frame so layout settles)
  requestAnimationFrame(() => { measure(); requestAnimationFrame(tick); });
  window.addEventListener('resize', () => {
    const newHalf = track.scrollWidth / 2;
    if (newHalf && newHalf !== halfWidth) halfWidth = newHalf;
  });
})();

// ===================================
// LIGHTBOX
// ===================================
(() => {
  const lightbox = document.getElementById('lightbox');
  const masonry = document.getElementById('masonry');
  if (!lightbox || !masonry) return;

  const stage = lightbox.querySelector('.lightbox-stage');
  const captionEl = lightbox.querySelector('.lightbox-caption');
  const currentEl = lightbox.querySelector('#lb-current');
  const totalEl = lightbox.querySelector('#lb-total');
  const closeBtn = lightbox.querySelector('.lightbox-close');
  const prevBtn = lightbox.querySelector('.lightbox-prev');
  const nextBtn = lightbox.querySelector('.lightbox-next');

  const items = Array.from(masonry.querySelectorAll('.masonry-item'));
  const data = items.map(el => ({
    type: el.dataset.lbType || 'image',
    src: el.dataset.lbSrc,
    caption: el.dataset.lbCaption || ''
  }));
  totalEl.textContent = data.length;

  let index = 0;
  let lastFocus = null;

  function render(i) {
    const item = data[i];
    if (!item) return;
    stage.innerHTML = '';

    if (item.type === 'video') {
      const v = document.createElement('video');
      v.src = item.src;
      v.controls = true;
      v.autoplay = true;
      v.loop = true;
      v.playsInline = true;
      stage.appendChild(v);
    } else {
      const img = document.createElement('img');
      img.src = item.src;
      img.alt = item.caption;
      stage.appendChild(img);
    }
    captionEl.textContent = item.caption;
    currentEl.textContent = i + 1;
  }

  function open(i) {
    index = (i + data.length) % data.length;
    lastFocus = document.activeElement;
    render(index);
    lightbox.classList.add('active');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.classList.add('lightbox-open');
    closeBtn.focus();
  }

  function close() {
    lightbox.classList.remove('active');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('lightbox-open');
    // stop any playing video
    const v = stage.querySelector('video');
    if (v) v.pause();
    setTimeout(() => { stage.innerHTML = ''; }, 400);
    lastFocus?.focus?.();
  }

  function next() { open(index + 1); }
  function prev() { open(index - 1); }

  items.forEach((el) => {
    el.setAttribute('tabindex', '0');
    el.setAttribute('role', 'button');
  });

  // Event delegation on masonry — works for clones (marquee loop) AND on iPad/touch
  function handleTileActivation(e) {
    const tile = e.target.closest('.masonry-item');
    if (!tile || !masonry.contains(tile)) return;
    const src = tile.dataset.lbSrc;
    if (!src) return;
    // Find the original item with matching data-lb-src (clones share the same src)
    const idx = data.findIndex(d => d.src === src);
    if (idx === -1) return;
    e.preventDefault();
    e.stopPropagation();
    open(idx);
  }
  masonry.addEventListener('click', handleTileActivation);
  masonry.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') handleTileActivation(e);
  });

  closeBtn.addEventListener('click', close);
  prevBtn.addEventListener('click', prev);
  nextBtn.addEventListener('click', next);
  // Close when clicking anywhere that isn't the media itself or a control button
  lightbox.addEventListener('click', (e) => {
    const t = e.target;
    if (t.closest('.lightbox-close, .lightbox-nav')) return;
    if (t.tagName === 'IMG' || t.tagName === 'VIDEO' || t.tagName === 'SOURCE') return;
    close();
  });

  // Close lightbox when user clicks any nav link (so navigation works mid-lightbox)
  navLinks?.addEventListener('click', (e) => {
    if (!lightbox.classList.contains('active')) return;
    if (e.target.closest('a')) close();
  });

  document.addEventListener('keydown', (e) => {
    if (!lightbox.classList.contains('active')) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowRight') next();
    else if (e.key === 'ArrowLeft') prev();
  });

  // Swipe (mobile)
  let touchStartX = 0;
  let touchStartY = 0;
  lightbox.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].clientX;
    touchStartY = e.changedTouches[0].clientY;
  }, { passive: true });
  lightbox.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) {
      if (dx > 0) prev(); else next();
    } else if (dy < -80) {
      close();
    }
  });
})();

// ===================================
// PRELOADER (simple)
// ===================================
window.addEventListener('load', () => {
  document.body.style.opacity = '1';
});
