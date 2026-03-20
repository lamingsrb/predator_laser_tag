// Custom Crosshair Cursor
class CustomCursor {
  constructor() {
    this.dot = document.getElementById('cursor-dot');
    this.ring = document.getElementById('cursor-ring');

    if (!this.dot || !this.ring) return;

    // Check for touch device
    if ('ontouchstart' in window) {
      this.dot.style.display = 'none';
      this.ring.style.display = 'none';
      return;
    }

    this.dotPos = { x: 0, y: 0 };
    this.ringPos = { x: 0, y: 0 };
    this.mousePos = { x: 0, y: 0 };
    this.isHovering = false;

    this.addEventListeners();
    this.animate();
  }

  addEventListeners() {
    document.addEventListener('mousemove', (e) => {
      this.mousePos.x = e.clientX;
      this.mousePos.y = e.clientY;
    });

    // Hover detection for interactive elements
    const interactiveElements = document.querySelectorAll('a, button, .package-card, .exp-card, .gallery-item, .birthday-card');
    interactiveElements.forEach(el => {
      el.addEventListener('mouseenter', () => {
        this.isHovering = true;
        this.dot.style.width = '14px';
        this.dot.style.height = '14px';
        this.dot.style.background = 'var(--cyan)';
        this.dot.style.boxShadow = '0 0 15px var(--cyan), 0 0 30px var(--cyan)';
        this.ring.style.width = '55px';
        this.ring.style.height = '55px';
        this.ring.style.borderColor = 'var(--red)';
      });
      el.addEventListener('mouseleave', () => {
        this.isHovering = false;
        this.dot.style.width = '8px';
        this.dot.style.height = '8px';
        this.dot.style.background = 'var(--red)';
        this.dot.style.boxShadow = '0 0 10px var(--red), 0 0 20px var(--red)';
        this.ring.style.width = '40px';
        this.ring.style.height = '40px';
        this.ring.style.borderColor = 'var(--cyan)';
      });
    });

    // Click effect
    document.addEventListener('mousedown', () => {
      this.dot.style.transform = 'translate(-50%, -50%) scale(0.5)';
      this.ring.style.transform = 'translate(-50%, -50%) scale(0.8)';
    });

    document.addEventListener('mouseup', () => {
      this.dot.style.transform = 'translate(-50%, -50%) scale(1)';
      this.ring.style.transform = 'translate(-50%, -50%) scale(1)';
    });
  }

  animate() {
    // Smooth follow for dot (faster)
    this.dotPos.x += (this.mousePos.x - this.dotPos.x) * 0.5;
    this.dotPos.y += (this.mousePos.y - this.dotPos.y) * 0.5;

    // Smooth follow for ring (slower, creates trailing effect)
    this.ringPos.x += (this.mousePos.x - this.ringPos.x) * 0.15;
    this.ringPos.y += (this.mousePos.y - this.ringPos.y) * 0.15;

    this.dot.style.left = `${this.dotPos.x}px`;
    this.dot.style.top = `${this.dotPos.y}px`;
    this.ring.style.left = `${this.ringPos.x}px`;
    this.ring.style.top = `${this.ringPos.y}px`;

    requestAnimationFrame(() => this.animate());
  }
}

// Initialize
new CustomCursor();
