export class Vector2 {
  x: number;
  y: number;

  constructor(x: number = 0, y: number = 0) {
    this.x = x;
    this.y = y;
  }

  add(v: Vector2): Vector2 {
    return new Vector2(this.x + v.x, this.y + v.y);
  }

  multiply(scalar: number): Vector2 {
    return new Vector2(this.x * scalar, this.y * scalar);
  }

  length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }
}

export class Particle {
  position: Vector2;
  velocity: Vector2;
  life: number;
  maxLife: number;
  color: string;

  constructor(x: number, y: number, vx: number, vy: number, life: number, color: string) {
    this.position = new Vector2(x, y);
    this.velocity = new Vector2(vx, vy);
    this.life = life;
    this.maxLife = life;
    this.color = color;
  }

  update(deltaTime: number) {
    this.position = this.position.add(this.velocity.multiply(deltaTime));
    this.life -= deltaTime;
  }

  draw(ctx: CanvasRenderingContext2D, x: number, y: number) {
    const alpha = this.life / this.maxLife;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.fillRect(x, y, 2, 2);
    ctx.globalAlpha = 1;
  }
}

export class DirectionIndicator {
  targetPosition: Vector2;
  type: string;
  distance: number;

  constructor(targetX: number, targetY: number, type: string, distance: number) {
    this.targetPosition = new Vector2(targetX, targetY);
    this.type = type;
    this.distance = distance;
  }

  draw(ctx: CanvasRenderingContext2D, shipPosition: Vector2, camera: Vector2, canvasWidth: number, canvasHeight: number) {
    const dx = this.targetPosition.x - shipPosition.x;
    const dy = this.targetPosition.y - shipPosition.y;
    const angle = Math.atan2(dy, dx);

    // Calculate color based on distance (red = close, blue = far)
    const normalizedDistance = Math.min(this.distance / 10000, 1); // 10km max
    const red = Math.floor(255 * normalizedDistance);
    const blue = Math.floor(255 * (1 - normalizedDistance));
    const color = `rgb(${red}, 0, ${blue})`;

    // Draw direction arrow on screen edge
    const arrowLength = 30;
    const arrowDistance = Math.min(canvasWidth, canvasHeight) / 2 - 50;

    let arrowX = canvasWidth / 2 + Math.cos(angle) * arrowDistance;
    let arrowY = canvasHeight / 2 + Math.sin(angle) * arrowDistance;

    // If target is on screen, don't show arrow
    const screenX = this.targetPosition.x - camera.x + canvasWidth / 2;
    const screenY = this.targetPosition.y - camera.y + canvasHeight / 2;
    const onScreen = screenX >= 0 && screenX <= canvasWidth && screenY >= 0 && screenY <= canvasHeight;

    if (!onScreen) {
      // Draw arrow pointing to target
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath();

      // Arrow shaft
      const shaftStartX = canvasWidth / 2 + Math.cos(angle) * (arrowDistance - arrowLength);
      const shaftStartY = canvasHeight / 2 + Math.sin(angle) * (arrowDistance - arrowLength);
      const shaftEndX = canvasWidth / 2 + Math.cos(angle) * arrowDistance;
      const shaftEndY = canvasHeight / 2 + Math.sin(angle) * arrowDistance;

      ctx.moveTo(shaftStartX, shaftStartY);
      ctx.lineTo(shaftEndX, shaftEndY);

      // Arrow head
      const headAngle1 = angle + Math.PI / 6;
      const headAngle2 = angle - Math.PI / 6;
      const headLength = 10;

      ctx.moveTo(shaftEndX, shaftEndY);
      ctx.lineTo(
        shaftEndX - Math.cos(headAngle1) * headLength,
        shaftEndY - Math.sin(headAngle1) * headLength
      );

      ctx.moveTo(shaftEndX, shaftEndY);
      ctx.lineTo(
        shaftEndX - Math.cos(headAngle2) * headLength,
        shaftEndY - Math.sin(headAngle2) * headLength
      );

      ctx.stroke();

      // Draw distance text
      ctx.fillStyle = color;
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      const distanceText = `${(this.distance / 1000).toFixed(1)}km`;
      ctx.fillText(distanceText, shaftEndX, shaftEndY - 15);
    }

    // Draw target type icon
    if (this.type === 'asteroid') {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(arrowX, arrowY, 5, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.type === 'starship') {
      ctx.fillStyle = color;
      ctx.fillRect(arrowX - 6, arrowY - 3, 12, 6);
    }
  }
}

export class SpaceObject {
  position: Vector2;
  velocity: Vector2;
  size: number;
  color: string;
  type: string;

  constructor(x: number, y: number, vx: number, vy: number, size: number, color: string, type: string) {
    this.position = new Vector2(x, y);
    this.velocity = new Vector2(vx, vy);
    this.size = size;
    this.color = color;
    this.type = type;
  }

  update(deltaTime: number) {
    this.position = this.position.add(this.velocity.multiply(deltaTime));
  }

  draw(ctx: CanvasRenderingContext2D, x: number, y: number) {
    ctx.fillStyle = this.color;
    if (this.type === 'starship') {
      // Draw as rectangle for starship
      ctx.fillRect(x - this.size / 2, y - this.size / 4, this.size, this.size / 2);
    } else {
      // Draw as circle for planet and asteroid
      ctx.beginPath();
      ctx.arc(x, y, this.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export class Ship {
  position: Vector2;
  velocity: Vector2;
  acceleration: Vector2;
  size: number;
  maxSpeed: number;
  isDropletMode: boolean = false; // 水滴模式
  dropletTimer: number = 0; // 水滴模式持续时间

  constructor(x: number, y: number) {
    this.position = new Vector2(x, y);
    this.velocity = new Vector2();
    this.acceleration = new Vector2();
    this.size = 100; // 飞船长度100m
    this.maxSpeed = 500; // 设置最大速度
  }

  update(deltaTime: number, keys: { [key: string]: boolean }) {
    // Check for droplet mode activation
    if (keys['ShiftLeft'] || keys['ShiftRight']) {
      this.isDropletMode = true;
      this.dropletTimer = 0.5; // 0.5 seconds of droplet mode
      this.maxSpeed = 2000; // Increased speed in droplet mode
    }

    // Update droplet timer
    if (this.dropletTimer > 0) {
      this.dropletTimer -= deltaTime;
      if (this.dropletTimer <= 0) {
        this.isDropletMode = false;
        this.maxSpeed = 500; // Reset speed
      }
    }

    // Ship controls
    const force = new Vector2();
    if (keys['ArrowUp'] || keys['KeyW']) force.y -= 300; // 增加力的大小
    if (keys['ArrowDown'] || keys['KeyS']) force.y += 300;
    if (keys['ArrowLeft'] || keys['KeyA']) force.x -= 300;
    if (keys['ArrowRight'] || keys['KeyD']) force.x += 300;
    this.applyForce(force);

    this.velocity = this.velocity.add(this.acceleration.multiply(deltaTime));
    // 限制最大速度
    if (this.velocity.length() > this.maxSpeed) {
      this.velocity = this.velocity.multiply(this.maxSpeed / this.velocity.length());
    }
    this.velocity = this.velocity.multiply(0.99); // 减少摩擦力，让速度保持更久
    this.position = this.position.add(this.velocity.multiply(deltaTime));
    this.acceleration = new Vector2(); // Reset acceleration
  }

  applyForce(force: Vector2) {
    this.acceleration = this.acceleration.add(force);
  }

  draw(ctx: CanvasRenderingContext2D, x: number, y: number) {
    if (this.isDropletMode) {
      // 水滴模式特效：发光轮廓
      ctx.shadowColor = '#00ff00';
      ctx.shadowBlur = 20;
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, y, 12, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    ctx.fillStyle = '#00ff00';
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.fill();
  }
}

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
