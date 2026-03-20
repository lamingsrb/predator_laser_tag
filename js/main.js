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
  'Mesto gde adrenalin preuzima kontrolu.',
  'Najmodernija laser tag arena u Beogradu.',
  'Nezaboravno iskustvo za celu porodicu.',
  'Rođendani. Team building. Akcija.',
  '280m² arene sa unikatnim dizajnom.',
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

// --- Gallery items ---
scrollReveal('.gallery-item',
  { opacity: 0, scale: 0.85 },
  { opacity: 1, scale: 1, duration: 0.6, ease: 'back.out(1.5)' },
  { staggerDelay: 0.1 }
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
  const selectors = '.exp-card, .package-card, .birthday-card, .gallery-item, .contact-item, .about-image-frame, .about-content, .about-badge, .map-wrapper, .section-header';
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
    background: #ff0040;
    border-radius: 50%;
    pointer-events: none;
    z-index: 9999;
    box-shadow: 0 0 10px #ff0040, 0 0 20px #ff0040, 0 0 40px #ff0040;
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
      background: ${['#ff0040', '#00f0ff', '#00ff88'][i % 3]};
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
// PRELOADER (simple)
// ===================================
window.addEventListener('load', () => {
  document.body.style.opacity = '1';
});
