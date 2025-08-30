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
    if (this.keys['Space']) {
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
          // Collision detected - create explosion effect
          this.createExplosion(obj.position.x, obj.position.y, obj.size);
          return false; // Remove the object
        }
        return true; // Keep the object
      });
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
        '#ffffff'
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
    // Create explosion particles
    const particleCount = Math.min(size / 10, 50); // More particles for larger objects
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount;
      const speed = Math.random() * 200 + 100;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const life = Math.random() * 1 + 0.5;
      const color = Math.random() > 0.5 ? '#ff6600' : '#ffaa00';
      const p = new Particle(x, y, vx, vy, life, color);
      this.particles.push(p);
    }

    // Add screen shake effect (simple implementation)
    this.camera.x += (Math.random() - 0.5) * 20;
    this.camera.y += (Math.random() - 0.5) * 20;
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

    // Draw stars
    for (let i = 0; i < 100; i++) {
      const x = (i * 37) % this.canvas.width;
      const y = (i * 23) % this.canvas.height;
      this.ctx.fillStyle = '#ffffff';
      this.ctx.fillRect(x, y, 1, 1);
    }

    // Draw objects relative to camera
    this.objects.forEach(obj => {
      const relX = obj.position.x - this.camera.x + this.canvas.width / 2;
      const relY = obj.position.y - this.camera.y + this.canvas.height / 2;
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
      const relX = p.position.x - this.camera.x + this.canvas.width / 2;
      const relY = p.position.y - this.camera.y + this.canvas.height / 2;
      p.draw(this.ctx, relX, relY);
    });

    // Draw ship
    const shipRelX = this.ship.position.x - this.camera.x + this.canvas.width / 2;
    const shipRelY = this.ship.position.y - this.camera.y + this.canvas.height / 2;
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
