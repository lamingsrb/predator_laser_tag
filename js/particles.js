import * as THREE from 'three';

// Three.js Particle System with Explosion on Click
class ParticleSystem {
  constructor() {
    this.canvas = document.getElementById('particles-canvas');
    if (!this.canvas) return;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: false
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.camera.position.z = 50;
    this.mouse = { x: 0, y: 0 };
    this.time = 0;
    this.isMobile = window.innerWidth < 768;

    // Explosion systems
    this.explosions = [];
    this.shockwaves = [];
    this.debris = [];

    // War-zone laser bolts — fire across the scene at random intervals,
    // alternating red/green, and blow up any particle they pass through.
    this.laserBolts = [];
    this.boltTimer = 3.5; // first bolt ~3.5s in so hero loads cleanly
    this.boltCounter = 0;

    // Raycaster for click detection
    this.raycaster = new THREE.Raycaster();
    this.raycaster.params.Points.threshold = 3;
    this.mouseVec = new THREE.Vector2();

    // Audio context for gunshot sound
    this.audioCtx = null;

    this.createParticles();
    this.createLaserLines();
    this.addEventListeners();
    this.animate();
  }

  createParticles() {
    const count = this.isMobile ? 50 : 180;
    this.particleCount = count;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    // Store original positions for respawn
    this.originalPositions = new Float32Array(count * 3);
    // Original colors for damage tinting
    this.originalColors = new Float32Array(count * 3);
    // Velocity array for explosion physics
    this.velocities = new Float32Array(count * 3);
    // State: 0 = normal, 1 = exploding/damaged, 2 = dying, 3 = dead, 4 = respawning
    this.particleStates = new Float32Array(count);
    // Life timer for exploding particles
    this.particleLife = new Float32Array(count);
    // HP system: each particle has health (0-100)
    this.particleHP = new Float32Array(count);
    // Original sizes
    this.originalSizes = new Float32Array(count);
    // Damage flash timer
    this.damageFlash = new Float32Array(count);
    // Respawn timer
    this.respawnTimer = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      this.particleHP[i] = 100;
      this.respawnTimer[i] = 0;
    }

    const palette = [
      new THREE.Color(0xff0040),
      new THREE.Color(0x00f0ff),
      new THREE.Color(0x00ff88),
      new THREE.Color(0x8b00ff),
    ];

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * 120;
      positions[i3 + 1] = (Math.random() - 0.5) * 80;
      positions[i3 + 2] = (Math.random() - 0.5) * 60;

      this.originalPositions[i3] = positions[i3];
      this.originalPositions[i3 + 1] = positions[i3 + 1];
      this.originalPositions[i3 + 2] = positions[i3 + 2];

      const color = palette[Math.floor(Math.random() * palette.length)];
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;

      this.originalColors[i3] = color.r;
      this.originalColors[i3 + 1] = color.g;
      this.originalColors[i3 + 2] = color.b;

      sizes[i] = Math.random() * 1.0 + 0.3;
      this.originalSizes[i] = sizes[i];
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 0.35,
      vertexColors: true,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    });

    this.particles = new THREE.Points(geometry, material);
    this.scene.add(this.particles);

    // Particles are smaller + more opaque on hero, larger + dimmer further down.
    // Hero height ≈ 100vh; we interpolate between HERO and REST based on scroll.
    this.particleAppearance = {
      hero:  { size: 0.35, opacity: 0.5 },
      rest:  { size: 1.15, opacity: 0.28 }
    };
  }

  createLaserLines() {
    this.laserLines = [];
    const laserColors = [0xff0040, 0x00f0ff, 0x00ff88];

    for (let i = 0; i < 5; i++) {
      const material = new THREE.LineBasicMaterial({
        color: laserColors[i % laserColors.length],
        transparent: true,
        opacity: 0.15,
        blending: THREE.AdditiveBlending
      });

      const points = [];
      const startX = (Math.random() - 0.5) * 100;
      const startY = (Math.random() - 0.5) * 60;
      const endX = (Math.random() - 0.5) * 100;
      const endY = (Math.random() - 0.5) * 60;

      points.push(new THREE.Vector3(startX, startY, -20));
      points.push(new THREE.Vector3(endX, endY, -20));

      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geometry, material);

      line.userData = {
        speed: Math.random() * 0.02 + 0.005,
        amplitude: Math.random() * 10 + 5,
        offset: Math.random() * Math.PI * 2
      };

      this.laserLines.push(line);
      this.scene.add(line);
    }
  }

  // === LASER BOLT — fires across the scene, damages particles it flies through ===
  spawnLaserBolt() {
    // Alternate red / green (Predator / Jedi)
    const isRed = this.boltCounter++ % 2 === 0;
    const color = isRed ? new THREE.Color(0xff0044) : new THREE.Color(0x33ff55);

    // Start and end on opposite sides of the visible box, with variety in axis + angle
    const horizontal = Math.random() < 0.6;
    let start, end;
    if (horizontal) {
      const dir = Math.random() < 0.5 ? 1 : -1;
      const y = (Math.random() - 0.5) * 60;
      const z = (Math.random() - 0.5) * 25;
      start = { x: -dir * 80, y,                         z };
      end   = { x:  dir * 80, y: y + (Math.random()-0.5)*20, z };
    } else {
      const dir = Math.random() < 0.5 ? 1 : -1;
      const x = (Math.random() - 0.5) * 90;
      const z = (Math.random() - 0.5) * 25;
      start = { x,                         y: -dir * 55, z };
      end   = { x: x + (Math.random()-0.5)*35, y:  dir * 55, z };
    }

    // Trail line — head at index 0 slides forward, older positions shift back
    const segCount = 24;
    const positions = new Float32Array(segCount * 3);
    for (let i = 0; i < segCount; i++) {
      positions[i*3]     = start.x;
      positions[i*3 + 1] = start.y;
      positions[i*3 + 2] = start.z;
    }
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const lineMat = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
    });
    const line = new THREE.Line(lineGeo, lineMat);
    this.scene.add(line);

    // Bright head point so the tip glows harder than the trail
    const headGeo = new THREE.BufferGeometry();
    headGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([start.x, start.y, start.z]), 3));
    const headMat = new THREE.PointsMaterial({
      color,
      size: 2.4,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    const head = new THREE.Points(headGeo, headMat);
    this.scene.add(head);

    // Speed: cross the scene in ~30-45 frames (0.5-0.75 s at 60 fps)
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const dz = end.z - start.z;
    const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
    const frames = 32 + Math.floor(Math.random() * 14);
    const vx = dx / frames, vy = dy / frames, vz = dz / frames;

    this.laserBolts.push({
      line, head,
      pos: { ...start },
      vel: { x: vx, y: vy, z: vz },
      segCount,
      framesLeft: frames + 14, // small tail fade after travel completes
      travelFrames: frames,
      hitRadius: 6,
    });
  }

  animateLaserBolts() {
    // Spawn cadence: 1.5-4 s between bolts; occasional double-shot burst.
    this.boltTimer -= 1/60; // rough: animate() runs via rAF ~60 Hz
    if (this.boltTimer <= 0) {
      this.spawnLaserBolt();
      if (Math.random() < 0.25) setTimeout(() => this.spawnLaserBolt(), 120);
      this.boltTimer = 1.5 + Math.random() * 2.5;
    }

    for (let b = this.laserBolts.length - 1; b >= 0; b--) {
      const bolt = this.laserBolts[b];

      // Advance head while travel budget remains
      if (bolt.framesLeft > bolt.travelFrames - bolt.travelFrames) {
        // always true during travel — keep velocity
      }
      bolt.pos.x += bolt.vel.x;
      bolt.pos.y += bolt.vel.y;
      bolt.pos.z += bolt.vel.z;
      bolt.framesLeft--;

      // Shift trail (index 0 = head, higher index = older)
      const lp = bolt.line.geometry.attributes.position.array;
      for (let i = bolt.segCount - 1; i > 0; i--) {
        lp[i*3]     = lp[(i-1)*3];
        lp[i*3 + 1] = lp[(i-1)*3 + 1];
        lp[i*3 + 2] = lp[(i-1)*3 + 2];
      }
      lp[0] = bolt.pos.x;
      lp[1] = bolt.pos.y;
      lp[2] = bolt.pos.z;
      bolt.line.geometry.attributes.position.needsUpdate = true;

      const hp = bolt.head.geometry.attributes.position.array;
      hp[0] = bolt.pos.x;
      hp[1] = bolt.pos.y;
      hp[2] = bolt.pos.z;
      bolt.head.geometry.attributes.position.needsUpdate = true;

      // Damage any particles near the bolt head — this reuses the mouse-click
      // damage path so killed particles spawn the same explosion/shockwave FX.
      this.damageNearbyParticles(
        new THREE.Vector3(bolt.pos.x, bolt.pos.y, bolt.pos.z),
        bolt.hitRadius
      );

      // Fade out in the last 14 frames
      const fadeStart = 14;
      if (bolt.framesLeft < fadeStart) {
        const k = Math.max(0, bolt.framesLeft / fadeStart);
        bolt.line.material.opacity = 0.95 * k;
        bolt.head.material.opacity = k;
      }

      if (bolt.framesLeft <= 0) {
        this.scene.remove(bolt.line);
        this.scene.remove(bolt.head);
        bolt.line.geometry.dispose();
        bolt.line.material.dispose();
        bolt.head.geometry.dispose();
        bolt.head.material.dispose();
        this.laserBolts.splice(b, 1);
      }
    }
  }

  // Create explosion burst at a 3D point
  createExplosion(point) {
    const burstCount = this.isMobile ? 12 : 30;
    const positions = new Float32Array(burstCount * 3);
    const colors = new Float32Array(burstCount * 3);
    const velocities = [];

    const explosionColors = [
      new THREE.Color(0xff0040),
      new THREE.Color(0xff4400),
      new THREE.Color(0xffaa00),
      new THREE.Color(0x00f0ff),
      new THREE.Color(0xffffff),
    ];

    for (let i = 0; i < burstCount; i++) {
      const i3 = i * 3;
      positions[i3] = point.x;
      positions[i3 + 1] = point.y;
      positions[i3 + 2] = point.z;

      // Random direction - spherical explosion
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const speed = 0.15 + Math.random() * 0.5;

      velocities.push({
        x: Math.sin(phi) * Math.cos(theta) * speed,
        y: Math.sin(phi) * Math.sin(theta) * speed,
        z: Math.cos(phi) * speed * 0.5
      });

      const color = explosionColors[Math.floor(Math.random() * explosionColors.length)];
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.8,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    });

    const explosionMesh = new THREE.Points(geometry, material);
    this.scene.add(explosionMesh);

    this.explosions.push({
      mesh: explosionMesh,
      velocities,
      life: 1.0,
      decay: 0.018 + Math.random() * 0.01
    });

    // Create shockwave ring
    this.createShockwave(point);

    // Create debris trails
    this.createDebrisTrails(point);
  }

  // Expanding ring shockwave
  createShockwave(point) {
    const ringGeo = new THREE.RingGeometry(0.1, 0.5, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xff0040,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.copy(point);
    ring.lookAt(this.camera.position);
    this.scene.add(ring);

    this.shockwaves.push({
      mesh: ring,
      life: 1.0,
      decay: 0.025
    });

    // Second shockwave (cyan, slightly delayed feel)
    const ringGeo2 = new THREE.RingGeometry(0.1, 0.3, 32);
    const ringMat2 = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });
    const ring2 = new THREE.Mesh(ringGeo2, ringMat2);
    ring2.position.copy(point);
    ring2.lookAt(this.camera.position);
    this.scene.add(ring2);

    this.shockwaves.push({
      mesh: ring2,
      life: 1.0,
      decay: 0.02,
      scaleSpeed: 0.7
    });
  }

  // Debris trails that fly outward
  createDebrisTrails(point) {
    const trailCount = this.isMobile ? 3 : 8;

    for (let t = 0; t < trailCount; t++) {
      const segCount = 6;
      const positions = new Float32Array(segCount * 3);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const speed = 0.4 + Math.random() * 0.6;

      for (let s = 0; s < segCount; s++) {
        positions[s * 3] = point.x;
        positions[s * 3 + 1] = point.y;
        positions[s * 3 + 2] = point.z;
      }

      const trailColors = [0xff0040, 0xff4400, 0xffaa00, 0x00f0ff, 0x00ff88];
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

      const material = new THREE.LineBasicMaterial({
        color: trailColors[t % trailColors.length],
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending
      });

      const line = new THREE.Line(geometry, material);
      this.scene.add(line);

      this.debris.push({
        mesh: line,
        velocity: {
          x: Math.sin(phi) * Math.cos(theta) * speed,
          y: Math.sin(phi) * Math.sin(theta) * speed,
          z: Math.cos(phi) * speed * 0.3
        },
        origin: { x: point.x, y: point.y, z: point.z },
        headPos: { x: point.x, y: point.y, z: point.z },
        life: 1.0,
        decay: 0.015 + Math.random() * 0.01,
        segCount
      });
    }
  }

  // Synthesized gunshot sound
  playGunshotSound() {
    try {
      if (!this.audioCtx) {
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = this.audioCtx;

      // Noise burst (gunshot crack)
      const duration = 0.15;
      const sampleRate = ctx.sampleRate;
      const bufferSize = sampleRate * duration;
      const buffer = ctx.createBuffer(1, bufferSize, sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        const t = i / sampleRate;
        // Sharp attack, fast decay noise
        const envelope = Math.exp(-t * 40);
        data[i] = (Math.random() * 2 - 1) * envelope;
      }

      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = buffer;

      // Low pass for body
      const lowpass = ctx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.value = 800;

      // High pass for crack
      const highpass = ctx.createBiquadFilter();
      highpass.type = 'highpass';
      highpass.frequency.value = 2000;

      const gainNode = ctx.createGain();
      gainNode.gain.value = 0.15;

      // Parallel: body + crack
      const merger = ctx.createGain();
      merger.gain.value = 1;

      noiseSource.connect(lowpass).connect(merger);

      const noiseSource2 = ctx.createBufferSource();
      noiseSource2.buffer = buffer;
      noiseSource2.connect(highpass).connect(merger);

      merger.connect(gainNode).connect(ctx.destination);

      noiseSource.start(ctx.currentTime);
      noiseSource2.start(ctx.currentTime);

      // Sub bass thump
      const osc = ctx.createOscillator();
      osc.frequency.value = 60;
      const oscGain = ctx.createGain();
      oscGain.gain.setValueAtTime(0.2, ctx.currentTime);
      oscGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.connect(oscGain).connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {
      // Audio not supported, silently skip
    }
  }

  // Flash the canvas briefly
  createFlash(point) {
    const flashGeo = new THREE.PlaneGeometry(200, 200);
    const flashMat = new THREE.MeshBasicMaterial({
      color: 0xff2200,
      transparent: true,
      opacity: 0.15,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    });
    const flash = new THREE.Mesh(flashGeo, flashMat);
    flash.position.z = 30;
    this.scene.add(flash);

    // Quick point light
    const light = new THREE.PointLight(0xff0040, 5, 80);
    light.position.copy(point);
    this.scene.add(light);

    // Auto remove
    setTimeout(() => {
      this.scene.remove(flash);
      flashGeo.dispose();
      flashMat.dispose();
    }, 60);

    setTimeout(() => {
      this.scene.remove(light);
      light.dispose();
    }, 150);
  }

  // Damage & scatter nearby ambient particles on explosion
  damageNearbyParticles(point, radius) {
    if (!this.particles) return;
    const positions = this.particles.geometry.attributes.position.array;
    const colors = this.particles.geometry.attributes.color.array;
    const sizes = this.particles.geometry.attributes.size.array;
    let killCount = 0;

    // Convert world-space explosion point to particle LOCAL space
    const localPoint = point.clone();
    this.particles.worldToLocal(localPoint);

    for (let i = 0; i < this.particleCount; i++) {
      // Skip dead or already respawning particles
      if (this.particleStates[i] === 3 || this.particleStates[i] === 4) continue;

      const i3 = i * 3;
      const dx = positions[i3] - localPoint.x;
      const dy = positions[i3 + 1] - localPoint.y;
      const dz = positions[i3 + 2] - localPoint.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (dist < radius) {
        // Damage based on proximity (closer = more damage)
        const proximity = 1 - dist / radius;
        const damage = proximity * 60 + Math.random() * 20; // 20-80 damage

        this.particleHP[i] -= damage;
        this.damageFlash[i] = 1.0; // trigger flash

        // Push away from explosion
        const force = proximity * 0.8;
        const nx = dx / (dist || 1);
        const ny = dy / (dist || 1);
        const nz = dz / (dist || 1);

        this.velocities[i3] = nx * force;
        this.velocities[i3 + 1] = ny * force;
        this.velocities[i3 + 2] = nz * force;

        if (this.particleHP[i] <= 0) {
          // KILLED — particle dies spectacularly
          this.particleHP[i] = 0;
          this.particleStates[i] = 2; // dying
          this.particleLife[i] = 1.0;
          killCount++;

          // Death velocity — fling hard
          const deathForce = 0.5 + Math.random() * 1.0;
          this.velocities[i3] = nx * deathForce + (Math.random() - 0.5) * 0.3;
          this.velocities[i3 + 1] = ny * deathForce + Math.random() * 0.5;
          this.velocities[i3 + 2] = nz * deathForce + (Math.random() - 0.5) * 0.3;

          // Flash white on death
          colors[i3] = 1;
          colors[i3 + 1] = 1;
          colors[i3 + 2] = 1;
        } else {
          // Damaged but alive — stagger
          this.particleStates[i] = 1;
          this.particleLife[i] = 0.5 + Math.random() * 0.3;
        }
      }
    }

    // If we killed particles, spawn mini-explosions at death sites
    if (killCount > 3) {
      this.createMiniExplosion(point, killCount);
    }

    this.particles.geometry.attributes.color.needsUpdate = true;
    this.particles.geometry.attributes.size.needsUpdate = true;
  }

  // Mini secondary explosion when multiple particles die
  createMiniExplosion(point, intensity) {
    const count = Math.min(intensity * 4, 30);
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const velocities = [];

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      positions[i3] = point.x + (Math.random() - 0.5) * 3;
      positions[i3 + 1] = point.y + (Math.random() - 0.5) * 3;
      positions[i3 + 2] = point.z + (Math.random() - 0.5) * 3;

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const speed = 0.2 + Math.random() * 0.8;
      velocities.push({
        x: Math.sin(phi) * Math.cos(theta) * speed,
        y: Math.sin(phi) * Math.sin(theta) * speed,
        z: Math.cos(phi) * speed * 0.4
      });

      // White-yellow-orange death sparks
      const t = Math.random();
      colors[i3] = 1;
      colors[i3 + 1] = 0.5 + t * 0.5;
      colors[i3 + 2] = t * 0.3;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.6,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    });

    const mesh = new THREE.Points(geometry, material);
    this.scene.add(mesh);

    this.explosions.push({
      mesh,
      velocities,
      life: 1.0,
      decay: 0.025
    });
  }

  handleClick(e) {
    // Convert screen to normalized device coords
    this.mouseVec.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.mouseVec.y = -(e.clientY / window.innerHeight) * 2 + 1;

    // Raycast to find click point in 3D space
    this.raycaster.setFromCamera(this.mouseVec, this.camera);

    // Check intersection with particles
    const intersects = this.raycaster.intersectObject(this.particles);

    let explosionPoint;

    if (intersects.length > 0) {
      // Hit a particle — explode there
      explosionPoint = intersects[0].point.clone();
    } else {
      // No particle hit — project click onto a plane at z=0
      const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
      const target = new THREE.Vector3();
      this.raycaster.ray.intersectPlane(plane, target);
      explosionPoint = target;
    }

    // FIRE!
    this.playGunshotSound();
    this.createFlash(explosionPoint);
    this.createExplosion(explosionPoint);
    this.damageNearbyParticles(explosionPoint, 20);
  }

  addEventListeners() {
    window.addEventListener('mousemove', (e) => {
      this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    });

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // CLICK TO SHOOT
    this.canvas.style.pointerEvents = 'auto';
    this.canvas.style.zIndex = '1';
    window.addEventListener('click', (e) => this.handleClick(e));
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    this.time += 0.01;

    // Scroll-driven size/opacity split: small+visible on hero, larger+dimmer elsewhere.
    if (this.particles && this.particleAppearance) {
      const heroEl = document.querySelector('.hero');
      const heroH = heroEl ? heroEl.offsetHeight : window.innerHeight;
      const t = Math.min(1, Math.max(0, (window.scrollY - heroH * 0.3) / (heroH * 0.7)));
      const { hero, rest } = this.particleAppearance;
      const targetSize    = hero.size    + (rest.size    - hero.size)    * t;
      const targetOpacity = hero.opacity + (rest.opacity - hero.opacity) * t;
      // Ease toward target so changes feel smooth mid-scroll
      this.particles.material.size    += (targetSize    - this.particles.material.size)    * 0.1;
      this.particles.material.opacity += (targetOpacity - this.particles.material.opacity) * 0.1;
    }

    // Rotate particles
    if (this.particles) {
      this.particles.rotation.y = this.time * 0.05;
      this.particles.rotation.x = Math.sin(this.time * 0.3) * 0.02;

      // Mouse influence
      this.particles.rotation.y += this.mouse.x * 0.02;
      this.particles.rotation.x += this.mouse.y * 0.02;

      // Float & physics for individual particles with HP system
      const positions = this.particles.geometry.attributes.position.array;
      const colors = this.particles.geometry.attributes.color.array;
      const sizes = this.particles.geometry.attributes.size.array;
      let colorsChanged = false;
      let sizesChanged = false;

      for (let i = 0; i < this.particleCount; i++) {
        const i3 = i * 3;

        // Damage flash decay (red flash on hit)
        if (this.damageFlash[i] > 0) {
          this.damageFlash[i] -= 0.05;
          colorsChanged = true;
        }

        if (this.particleStates[i] === 0) {
          // === NORMAL / ALIVE ===
          positions[i3 + 1] += Math.sin(this.time + i) * 0.005;

          // Color reflects HP: healthy = original color, damaged = shift to red/dim
          const hpRatio = this.particleHP[i] / 100;

          if (hpRatio < 1) {
            // Damaged — tint towards red, flicker
            const flicker = this.damageFlash[i] > 0 ? 1 : 0;
            const dmgR = this.originalColors[i3] * hpRatio + (1 - hpRatio) * 1.0;
            const dmgG = this.originalColors[i3 + 1] * hpRatio * 0.3;
            const dmgB = this.originalColors[i3 + 2] * hpRatio * 0.3;

            colors[i3] = Math.min(1, dmgR + flicker * 0.5);
            colors[i3 + 1] = dmgG + flicker * 0.1;
            colors[i3 + 2] = dmgB + flicker * 0.1;
            colorsChanged = true;

            // Size shrinks slightly with damage
            sizes[i] = this.originalSizes[i] * (0.5 + hpRatio * 0.5);
            sizesChanged = true;

            // Low HP flicker/shake
            if (hpRatio < 0.3) {
              const shake = Math.sin(this.time * 30 + i * 7) * 0.1 * (1 - hpRatio);
              positions[i3] += shake;
              positions[i3 + 1] += Math.cos(this.time * 25 + i * 11) * 0.08 * (1 - hpRatio);
            }
          }

        } else if (this.particleStates[i] === 1) {
          // === DAMAGED / STAGGERING ===
          positions[i3] += this.velocities[i3];
          positions[i3 + 1] += this.velocities[i3 + 1];
          positions[i3 + 2] += this.velocities[i3 + 2];

          this.velocities[i3] *= 0.94;
          this.velocities[i3 + 1] *= 0.94;
          this.velocities[i3 + 2] *= 0.94;
          this.velocities[i3 + 1] -= 0.001;

          // Flash red while staggering
          const flash = Math.sin(this.time * 20) * 0.5 + 0.5;
          colors[i3] = 1;
          colors[i3 + 1] = flash * 0.3;
          colors[i3 + 2] = 0;
          colorsChanged = true;

          this.particleLife[i] -= 0.015;

          if (this.particleLife[i] <= 0) {
            // Recover — go back to normal but keep damage
            this.particleStates[i] = 0;
            // Restore color based on HP
            const hpRatio = this.particleHP[i] / 100;
            colors[i3] = this.originalColors[i3] * hpRatio + (1 - hpRatio);
            colors[i3 + 1] = this.originalColors[i3 + 1] * hpRatio * 0.5;
            colors[i3 + 2] = this.originalColors[i3 + 2] * hpRatio * 0.5;
          }

        } else if (this.particleStates[i] === 2) {
          // === DYING — flung outward, shrinking, fading ===
          positions[i3] += this.velocities[i3];
          positions[i3 + 1] += this.velocities[i3 + 1];
          positions[i3 + 2] += this.velocities[i3 + 2];

          // Heavy gravity on dying particles
          this.velocities[i3 + 1] -= 0.008;
          this.velocities[i3] *= 0.97;
          this.velocities[i3 + 1] *= 0.97;
          this.velocities[i3 + 2] *= 0.97;

          this.particleLife[i] -= 0.012;

          // Shrink as it dies
          sizes[i] = this.originalSizes[i] * Math.max(0, this.particleLife[i]);
          sizesChanged = true;

          // Color fades: white → orange → red → dark
          const life = this.particleLife[i];
          if (life > 0.6) {
            colors[i3] = 1; colors[i3 + 1] = 1; colors[i3 + 2] = life;
          } else if (life > 0.3) {
            colors[i3] = 1; colors[i3 + 1] = life; colors[i3 + 2] = 0;
          } else {
            colors[i3] = life * 3; colors[i3 + 1] = 0; colors[i3 + 2] = 0;
          }
          colorsChanged = true;

          // Spin/tumble effect
          positions[i3] += Math.sin(this.time * 15 + i) * 0.03 * life;

          if (this.particleLife[i] <= 0) {
            // DEAD — hide particle offscreen, start respawn timer
            this.particleStates[i] = 3;
            positions[i3] = 9999;
            positions[i3 + 1] = 9999;
            positions[i3 + 2] = 9999;
            sizes[i] = 0;
            sizesChanged = true;
            this.respawnTimer[i] = 3 + Math.random() * 5; // 3-8 seconds to respawn
          }

        } else if (this.particleStates[i] === 3) {
          // === DEAD — waiting to respawn ===
          this.respawnTimer[i] -= 0.016; // ~60fps

          if (this.respawnTimer[i] <= 0) {
            // Begin respawn sequence
            this.particleStates[i] = 4;
            this.particleLife[i] = 0;
            this.particleHP[i] = 100;

            // Spawn at random new position near original
            const ox = this.originalPositions[i3] + (Math.random() - 0.5) * 10;
            const oy = this.originalPositions[i3 + 1] + (Math.random() - 0.5) * 10;
            const oz = this.originalPositions[i3 + 2];
            positions[i3] = ox;
            positions[i3 + 1] = oy;
            positions[i3 + 2] = oz;
          }

        } else if (this.particleStates[i] === 4) {
          // === RESPAWNING — fade in with glow ===
          this.particleLife[i] += 0.008;
          const fadeIn = this.particleLife[i];

          sizes[i] = this.originalSizes[i] * fadeIn;
          sizesChanged = true;

          // Glow cyan while spawning, then shift to original color
          if (fadeIn < 0.5) {
            colors[i3] = 0;
            colors[i3 + 1] = fadeIn * 2;
            colors[i3 + 2] = 1;
          } else {
            const t = (fadeIn - 0.5) * 2;
            colors[i3] = this.originalColors[i3] * t;
            colors[i3 + 1] = this.originalColors[i3 + 1] * t + (1 - t) * fadeIn;
            colors[i3 + 2] = this.originalColors[i3 + 2] * t + (1 - t);
          }
          colorsChanged = true;

          // Gentle float upward while spawning
          positions[i3 + 1] += 0.02;

          if (fadeIn >= 1) {
            // Fully alive again
            this.particleStates[i] = 0;
            this.particleLife[i] = 0;
            sizes[i] = this.originalSizes[i];

            // Drift toward original position
            const ox = this.originalPositions[i3];
            const oy = this.originalPositions[i3 + 1];
            positions[i3] += (ox - positions[i3]) * 0.1;
            positions[i3 + 1] += (oy - positions[i3 + 1]) * 0.1;

            // Restore original color
            colors[i3] = this.originalColors[i3];
            colors[i3 + 1] = this.originalColors[i3 + 1];
            colors[i3 + 2] = this.originalColors[i3 + 2];
          }
        }
      }

      this.particles.geometry.attributes.position.needsUpdate = true;
      if (colorsChanged) this.particles.geometry.attributes.color.needsUpdate = true;
      if (sizesChanged) this.particles.geometry.attributes.size.needsUpdate = true;
    }

    // Animate explosions
    for (let e = this.explosions.length - 1; e >= 0; e--) {
      const exp = this.explosions[e];
      exp.life -= exp.decay;

      const positions = exp.mesh.geometry.attributes.position.array;
      for (let i = 0; i < exp.velocities.length; i++) {
        const i3 = i * 3;
        const v = exp.velocities[i];
        positions[i3] += v.x;
        positions[i3 + 1] += v.y;
        positions[i3 + 2] += v.z;

        // Gravity
        v.y -= 0.005;
        // Damping
        v.x *= 0.98;
        v.y *= 0.98;
        v.z *= 0.98;
      }
      exp.mesh.geometry.attributes.position.needsUpdate = true;
      exp.mesh.material.opacity = exp.life * 0.9;
      exp.mesh.material.size = 0.8 * exp.life + 0.2;

      if (exp.life <= 0) {
        this.scene.remove(exp.mesh);
        exp.mesh.geometry.dispose();
        exp.mesh.material.dispose();
        this.explosions.splice(e, 1);
      }
    }

    // Animate shockwaves
    for (let s = this.shockwaves.length - 1; s >= 0; s--) {
      const sw = this.shockwaves[s];
      sw.life -= sw.decay;

      const scaleSpeed = sw.scaleSpeed || 1;
      const scale = 1 + (1 - sw.life) * 25 * scaleSpeed;
      sw.mesh.scale.set(scale, scale, scale);
      sw.mesh.material.opacity = sw.life * 0.6;

      if (sw.life <= 0) {
        this.scene.remove(sw.mesh);
        sw.mesh.geometry.dispose();
        sw.mesh.material.dispose();
        this.shockwaves.splice(s, 1);
      }
    }

    // Animate debris trails
    for (let d = this.debris.length - 1; d >= 0; d--) {
      const db = this.debris[d];
      db.life -= db.decay;

      // Move head
      db.headPos.x += db.velocity.x;
      db.headPos.y += db.velocity.y;
      db.headPos.z += db.velocity.z;

      // Gravity
      db.velocity.y -= 0.003;
      // Damping
      db.velocity.x *= 0.98;
      db.velocity.y *= 0.98;
      db.velocity.z *= 0.98;

      // Update trail segments (shift positions, head at index 0)
      const positions = db.mesh.geometry.attributes.position.array;
      for (let s = db.segCount - 1; s > 0; s--) {
        positions[s * 3] = positions[(s - 1) * 3];
        positions[s * 3 + 1] = positions[(s - 1) * 3 + 1];
        positions[s * 3 + 2] = positions[(s - 1) * 3 + 2];
      }
      positions[0] = db.headPos.x;
      positions[1] = db.headPos.y;
      positions[2] = db.headPos.z;
      db.mesh.geometry.attributes.position.needsUpdate = true;

      db.mesh.material.opacity = db.life * 0.8;

      if (db.life <= 0) {
        this.scene.remove(db.mesh);
        db.mesh.geometry.dispose();
        db.mesh.material.dispose();
        this.debris.splice(d, 1);
      }
    }

    // War-zone bolts (periodic + collision with particles)
    this.animateLaserBolts();

    // Animate laser lines
    this.laserLines.forEach(line => {
      const { speed, amplitude, offset } = line.userData;
      const positions = line.geometry.attributes.position.array;
      positions[1] = Math.sin(this.time * speed * 50 + offset) * amplitude;
      positions[4] = Math.cos(this.time * speed * 50 + offset) * amplitude;
      line.geometry.attributes.position.needsUpdate = true;
      line.material.opacity = 0.1 + Math.sin(this.time + offset) * 0.08;
    });

    this.renderer.render(this.scene, this.camera);
  }
}

// Initialize
new ParticleSystem();
