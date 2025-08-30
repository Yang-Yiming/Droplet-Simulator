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
    ctx.beginPath();
    ctx.arc(x, y, this.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

export class Ship {
  position: Vector2;
  velocity: Vector2;
  acceleration: Vector2;
  size: number;
  maxSpeed: number;

  constructor(x: number, y: number) {
    this.position = new Vector2(x, y);
    this.velocity = new Vector2();
    this.acceleration = new Vector2();
    this.size = 10;
    this.maxSpeed = 500; // 设置最大速度
  }

  update(deltaTime: number) {
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
    ctx.fillStyle = '#00ff00';
    ctx.beginPath();
    ctx.arc(x, y, this.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

export class Game {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  ship: Ship;
  objects: SpaceObject[];
  particles: Particle[];
  keys: { [key: string]: boolean } = {};
  lastTime: number = 0;
  speedDisplay: HTMLElement;
  objectsDisplay: HTMLElement;
  camera: Vector2;

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.ship = new Ship(0, 0); // 飞船初始位置在世界坐标 (0, 0)
    this.camera = new Vector2(0, 0); // 摄像头初始位置
    this.objects = [];
    this.particles = [];
    this.speedDisplay = document.getElementById('speed')!;
    this.objectsDisplay = document.getElementById('objects')!;
    this.init();
  }

  init() {
    window.addEventListener('keydown', (e) => this.keys[e.code] = true);
    window.addEventListener('keyup', (e) => this.keys[e.code] = false);
    this.generateObjects();
    this.gameLoop(0);
  }

  generateObjects() {
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * this.canvas.width * 10 - this.canvas.width * 5;
      const y = Math.random() * this.canvas.height * 10 - this.canvas.height * 5;
      const vx = (Math.random() - 0.5) * 20;
      const vy = (Math.random() - 0.5) * 20;
      const size = Math.random() * 50 + 10;
      const color = Math.random() > 0.5 ? '#888888' : '#444444';
      const type = Math.random() > 0.5 ? 'asteroid' : 'planet';
      this.objects.push(new SpaceObject(x, y, vx, vy, size, color, type));
    }
  }

  update(deltaTime: number) {
    // Ship controls
    const force = new Vector2();
    if (this.keys['ArrowUp'] || this.keys['KeyW']) force.y -= 300; // 增加力的大小
    if (this.keys['ArrowDown'] || this.keys['KeyS']) force.y += 300;
    if (this.keys['ArrowLeft'] || this.keys['KeyA']) force.x -= 300;
    if (this.keys['ArrowRight'] || this.keys['KeyD']) force.x += 300;
    this.ship.applyForce(force);

    this.ship.update(deltaTime);

    // Update camera to smoothly follow ship
    const lerpFactor = 0.05; // 跟随速度
    this.camera.x += (this.ship.position.x - this.camera.x) * lerpFactor;
    this.camera.y += (this.ship.position.y - this.camera.y) * lerpFactor;

    // Update objects
    this.objects.forEach(obj => obj.update(deltaTime));

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

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

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
