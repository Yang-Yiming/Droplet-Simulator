import { Vector2 } from './entities/Vector2';
import { Particle } from './entities/Particle';
import { DirectionIndicator } from './entities/DirectionIndicator';
import { SpaceObject } from './entities/SpaceObject';
import { Ship } from './entities/Ship';

export class Game {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  ship: Ship;
  objects: SpaceObject[];
  particles: Particle[];
  directionIndicators: DirectionIndicator[];
  keys: { [key: string]: boolean } = {};
  lastTime: number = 0;
  speedDisplay: HTMLElement;
  objectsDisplay: HTMLElement;
  camera: Vector2;
  generatedRegions: Set<string> = new Set(); // Track generated regions
  screenShakeTimer: number = 0; // 屏幕震动定时器
  screenShakeIntensity: number = 0; // 震动强度
  flashTimer: number = 0; // 爆炸闪光定时器
  flashIntensity: number = 0; // 闪光强度

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.ship = new Ship(0, 0); // 飞船初始位置在世界坐标 (0, 0)
    this.camera = new Vector2(0, 0); // 摄像头初始位置
    this.objects = [];
    this.particles = [];
    this.directionIndicators = [];
    this.speedDisplay = document.getElementById('speed')!;
    this.objectsDisplay = document.getElementById('objects')!;
    this.init();
  }

  init() {
    window.addEventListener('keydown', (e) => this.keys[e.code] = true);
    window.addEventListener('keyup', (e) => this.keys[e.code] = false);
    this.generateInitialObjects(); // Only generate objects near spawn
    this.gameLoop(0);
  }

  generateInitialObjects() {
    // Generate some objects in nearby regions, but keep spawn area (2km radius) clear
    const regionSize = 10000; // 10km regions
    for (let dx = -2; dx <= 2; dx++) {
      for (let dy = -2; dy <= 2; dy++) {
        if (dx === 0 && dy === 0) continue; // Skip spawn region
        this.generateObjectsInRegion(dx * regionSize, dy * regionSize, regionSize, regionSize);
      }
    }
  }

  generateObjectsInRegion(centerX: number, centerY: number, width: number, height: number) {
    const regionKey = `${Math.floor(centerX / width)},${Math.floor(centerY / height)}`;
    if (this.generatedRegions.has(regionKey)) return;
    this.generatedRegions.add(regionKey);

    // Generate small asteroids in this region
    const asteroidCount = Math.floor(Math.random() * 5) + 3; // 3-7 asteroids per region
    for (let i = 0; i < asteroidCount; i++) {
      const x = centerX + Math.random() * width - width / 2;
      const y = centerY + Math.random() * height - height / 2;
      const vx = (Math.random() - 0.5) * 20;
      const vy = (Math.random() - 0.5) * 20;
      const size = Math.random() * 50 + 10;
      const color = '#444444';
      this.objects.push(new SpaceObject(x, y, vx, vy, size, color, 'asteroid'));
    }

    // Randomly generate starships (5% chance per region)
    if (Math.random() < 0.05) {
      const x = centerX + Math.random() * width - width / 2;
      const y = centerY + Math.random() * height - height / 2;
      const vx = (Math.random() - 0.5) * 50;
      const vy = (Math.random() - 0.5) * 50;
      const size = Math.random() * 500 + 500; // 500m to 1km length
      const color = '#ff0000';
      this.objects.push(new SpaceObject(x, y, vx, vy, size, color, 'starship'));
    }
  }

  generateObjects() {
    // This method is now replaced by generateInitialObjects and generateObjectsInRegion
  }

  update(deltaTime: number) {
    // Ship controls
    const force = new Vector2();
    if (this.keys['ArrowUp'] || this.keys['KeyW']) force.y -= 300; // 增加力的大小
    if (this.keys['ArrowDown'] || this.keys['KeyS']) force.y += 300;
    if (this.keys['ArrowLeft'] || this.keys['KeyA']) force.x -= 300;
    if (this.keys['ArrowRight'] || this.keys['KeyD']) force.x += 300;
    this.ship.applyForce(force);

    this.ship.update(deltaTime, this.keys);

    // Update camera to smoothly follow ship
    const lerpFactor = 0.05; // 跟随速度
    this.camera.x += (this.ship.position.x - this.camera.x) * lerpFactor;
    this.camera.y += (this.ship.position.y - this.camera.y) * lerpFactor;

    // Generate new regions as camera moves
    this.generateNearbyRegions();

    // Handle scanning
    if (this.keys['KeyK']) {
      this.updateNavigation();
    } else {
      this.directionIndicators = []; // Clear indicators when not scanning
    }

    // Check for collisions in droplet mode
    if (this.ship.isDropletMode) {
      this.objects = this.objects.filter(obj => {
        const dx = obj.position.x - this.ship.position.x;
        const dy = obj.position.y - this.ship.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const minDistance = obj.size + this.ship.size;

        if (distance < minDistance) {
          // 飞船进入碰撞箱
          obj.isEntered = true;
        } else if (obj.isEntered && obj.explosionTimer === 0) {
          // 飞船离开碰撞箱，开始爆炸定时器
          obj.explosionTimer = 0.5;
        }

        if (obj.explosionTimer > 0) {
          obj.explosionTimer -= deltaTime;
          if (obj.explosionTimer <= 0) {
            // 爆炸
            this.createExplosion(obj.position.x, obj.position.y, obj.size);
            return false; // 移除物体
          }
        }

        return true; // 保留物体
      });
    }

    // Update screen shake
    if (this.screenShakeTimer > 0) {
      this.screenShakeTimer -= deltaTime;
      if (this.screenShakeTimer <= 0) {
        this.screenShakeIntensity = 0;
      }
    }

    // Update flash effect
    if (this.flashTimer > 0) {
      this.flashTimer -= deltaTime;
      if (this.flashTimer <= 0) {
        this.flashIntensity = 0;
      }
    }

    // Update objects
    this.objects.forEach(obj => obj.update(deltaTime));

    // Update scan markers
    // Removed scanMarkers update code

    // Generate particles
    if (Math.random() < 0.1) {
      const p = new Particle(
        this.ship.position.x + (Math.random() - 0.5) * 20,
        this.ship.position.y + (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 100,
        (Math.random() - 0.5) * 100,
        2,
        '#ffffff',
        1,
        'normal'
      );
      this.particles.push(p);
    }

    // Update particles
    this.particles = this.particles.filter(p => {
      p.update(deltaTime);
      return p.life > 0;
    });

    // Update UI
    this.speedDisplay.textContent = `Speed: ${this.ship.velocity.length().toFixed(1)}`;
    this.objectsDisplay.textContent = `Objects: ${this.objects.length}`;
  }

  updateNavigation() {
    // Update direction indicators for objects within 10km
    const scanRadius = 10000; // 10km scan radius
    this.directionIndicators = [];

    this.objects.forEach(obj => {
      const dx = obj.position.x - this.ship.position.x;
      const dy = obj.position.y - this.ship.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance <= scanRadius && distance > 50) { // Don't show very close objects
        const indicator = new DirectionIndicator(obj.position.x, obj.position.y, obj.type, distance);
        this.directionIndicators.push(indicator);
      }
    });
  }

  createExplosion(x: number, y: number, size: number) {
    // Create massive explosion particles with enhanced variety
    const particleCount = Math.min(size / 2, 200); // Even more particles for larger objects
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.8;
      const speed = Math.random() * 500 + 200; // Faster particles
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const life = Math.random() * 3 + 2; // Much longer life for dramatic effect
      const colors = ['#ff3300', '#ff6600', '#ffaa00', '#ffff00', '#ff0000', '#ffffff', '#ffcc00', '#ff8800'];
      const color = colors[Math.floor(Math.random() * colors.length)];
      const particleSize = Math.random() * 3 + 1;
      const p = new Particle(x, y, vx, vy, life, color, particleSize, 'normal');
      this.particles.push(p);
    }

    // Add intense shockwave particles
    for (let i = 0; i < 50; i++) {
      const angle = (Math.PI * 2 * i) / 50;
      const speed = Math.random() * 150 + 100; // Faster shockwave
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const life = Math.random() * 1 + 0.5;
      const p = new Particle(x, y, vx, vy, life, '#ffffff', 1, 'shockwave');
      this.particles.push(p);
    }

    // Add fire sparks for extra drama
    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 300 + 150;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const life = Math.random() * 2 + 1;
      const sparkColors = ['#ff3300', '#ff6600', '#ffaa00', '#ffff00'];
      const color = sparkColors[Math.floor(Math.random() * sparkColors.length)];
      const p = new Particle(x, y, vx, vy, life, color, 2, 'spark');
      this.particles.push(p);
    }

    // Add debris particles
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 100 + 50;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const life = Math.random() * 4 + 2;
      const debrisColors = ['#666666', '#888888', '#aaaaaa', '#cccccc'];
      const color = debrisColors[Math.floor(Math.random() * debrisColors.length)];
      const p = new Particle(x, y, vx, vy, life, color, 3, 'debris');
      this.particles.push(p);
    }

    // Add secondary explosion particles for extra drama
    for (let i = 0; i < 15; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * size * 2;
      const ex = x + Math.cos(angle) * distance;
      const ey = y + Math.sin(angle) * distance;
      const speed = Math.random() * 200 + 50;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const life = Math.random() * 2 + 1;
      const colors = ['#ff6600', '#ffaa00', '#ffff00', '#ff0000'];
      const color = colors[Math.floor(Math.random() * colors.length)];
      const p = new Particle(ex, ey, vx, vy, life, color, 2, 'normal');
      this.particles.push(p);
    }

    // Start intense screen shake
    this.screenShakeTimer = 1.0; // Longer shake duration
    this.screenShakeIntensity = Math.min(size / 25, 40); // Much stronger shake

    // Trigger flash effect
    this.flashTimer = 0.2; // Short flash duration
    this.flashIntensity = Math.min(size / 100, 1); // Flash intensity based on explosion size
  }

  generateNearbyRegions() {
    const regionSize = 10000; // 10km regions
    const cameraRegionX = Math.floor(this.camera.x / regionSize);
    const cameraRegionY = Math.floor(this.camera.y / regionSize);

    // Generate regions in a 5x5 area around camera
    for (let dx = -2; dx <= 2; dx++) {
      for (let dy = -2; dy <= 2; dy++) {
        const regionX = cameraRegionX + dx;
        const regionY = cameraRegionY + dy;
        const centerX = regionX * regionSize;
        const centerY = regionY * regionSize;

        // Skip if too close to spawn (within 2km radius)
        const distanceFromSpawn = Math.sqrt(centerX * centerX + centerY * centerY);
        if (distanceFromSpawn < 2000) continue; // 2km = 2000 units

        this.generateObjectsInRegion(centerX, centerY, regionSize, regionSize);
      }
    }
  }

  draw() {
    // Fill background with cosmic black
    this.ctx.fillStyle = '#000011'; // Deep space black with slight blue tint
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Apply flash effect
    if (this.flashTimer > 0) {
      this.ctx.fillStyle = `rgba(255, 255, 255, ${this.flashIntensity * 0.3})`;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    // Apply explosion pulse effect (subtle background brightening)
    if (this.screenShakeTimer > 0.8) {
      this.ctx.fillStyle = `rgba(255, 100, 0, ${(1.0 - this.screenShakeTimer) * 0.1})`;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    // Calculate screen shake offset with diminishing intensity
    const shakeX = this.screenShakeTimer > 0 ? (Math.random() - 0.5) * this.screenShakeIntensity * (this.screenShakeTimer / 1.0) : 0;
    const shakeY = this.screenShakeTimer > 0 ? (Math.random() - 0.5) * this.screenShakeIntensity * (this.screenShakeTimer / 1.0) : 0;

    // Draw stars
    for (let i = 0; i < 100; i++) {
      const x = (i * 37) % this.canvas.width + shakeX;
      const y = (i * 23) % this.canvas.height + shakeY;
      this.ctx.fillStyle = '#ffffff';
      this.ctx.fillRect(x, y, 1, 1);
    }

    // Draw objects relative to camera
    this.objects.forEach(obj => {
      const relX = obj.position.x - this.camera.x + this.canvas.width / 2 + shakeX;
      const relY = obj.position.y - this.camera.y + this.canvas.height / 2 + shakeY;
      if (relX > -obj.size && relX < this.canvas.width + obj.size &&
          relY > -obj.size && relY < this.canvas.height + obj.size) {
        obj.draw(this.ctx, relX, relY);
      }
    });

    // Draw direction indicators
    this.directionIndicators.forEach(indicator => {
      indicator.draw(this.ctx, this.ship.position, this.camera, this.canvas.width, this.canvas.height);
    });

    // Draw particles
    this.particles.forEach(p => {
      const relX = p.position.x - this.camera.x + this.canvas.width / 2 + shakeX;
      const relY = p.position.y - this.camera.y + this.canvas.height / 2 + shakeY;
      p.draw(this.ctx, relX, relY);
    });

    // Draw ship
    const shipRelX = this.ship.position.x - this.camera.x + this.canvas.width / 2 + shakeX;
    const shipRelY = this.ship.position.y - this.camera.y + this.canvas.height / 2 + shakeY;
    this.ship.draw(this.ctx, shipRelX, shipRelY);
  }

  gameLoop(currentTime: number) {
    const deltaTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    this.update(deltaTime);
    this.draw();

    requestAnimationFrame((time) => this.gameLoop(time));
  }
}
