import { Vector2 } from './entities/Vector2';
import { Particle } from './entities/Particle';
import { DirectionIndicator } from './entities/DirectionIndicator';
import { SpaceObject } from './entities/SpaceObject';
import { Ship } from './entities/Ship';
import { Megastructure } from './entities/Megastructure';

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
  zoom: number = 1.0; // 全局缩放因子

  // 屏幕震动效果
  screenShake: Vector2 = new Vector2(0, 0);
  screenShakeIntensity: number = 0;
  screenShakeDuration: number = 0;

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

    // Add a test megastructure near spawn for debugging
    const testMega = new Megastructure(500, 500, 0, 0, 300, '#ff0000', 'megaship');
    this.objects.push(testMega);
    console.log('Test megastructure added at:', testMega.position.x, testMega.position.y, 'size:', testMega.size, 'canvas size:', testMega.canvas.width, 'x', testMega.canvas.height);
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

    // Randomly generate megastructures (1% chance per region)
    if (Math.random() < 0.01) {
      const x = centerX + Math.random() * width - width / 2;
      const y = centerY + Math.random() * height - height / 2;
      const vx = (Math.random() - 0.5) * 20;
      const vy = (Math.random() - 0.5) * 20;
      const size = Math.random() * 2000 + 1000; // 1km to 3km
      const color = Math.random() < 0.5 ? '#ff0000' : '#888888'; // Red for ships, gray for planets
      const type = Math.random() < 0.5 ? 'megaship' : 'megaplanet';
      this.objects.push(new Megastructure(x, y, vx, vy, size, color, type));
    }
  }

  generateObjects() {
    // This method is now replaced by generateInitialObjects and generateObjectsInRegion
  }

  update(deltaTime: number) {
    // 更新屏幕震动
    if (this.screenShakeDuration > 0) {
      this.screenShakeDuration -= deltaTime;
      this.screenShakeIntensity *= 0.95; // 震动逐渐减弱
      
      if (this.screenShakeDuration <= 0) {
        this.screenShake.x = 0;
        this.screenShake.y = 0;
        this.screenShakeIntensity = 0;
      } else {
        // 随机震动方向
        this.screenShake.x = (Math.random() - 0.5) * this.screenShakeIntensity;
        this.screenShake.y = (Math.random() - 0.5) * this.screenShakeIntensity;
      }
    }

    // Ship controls
    const force = new Vector2();
    if (this.keys['ArrowUp'] || this.keys['KeyW']) force.y -= 300; // 增加力的大小
    if (this.keys['ArrowDown'] || this.keys['KeyS']) force.y += 300;
    if (this.keys['ArrowLeft'] || this.keys['KeyA']) force.x -= 300;
    if (this.keys['ArrowRight'] || this.keys['KeyD']) force.x += 300;
    this.ship.applyForce(force);

    // Zoom controls
    if (this.keys['KeyZ']) {
      this.zoomOut();
    }
    if (this.keys['KeyX']) {
      this.zoomIn();
    }

    this.ship.update(deltaTime, this.keys);

    // Update camera to smoothly follow ship with catch-up
    const baseLerpFactor = 0.05; // 基础跟随速度
    const shipSpeed = this.ship.velocity.length();
    // 根据飞船速度动态调整跟随速度，速度越快跟随越快
    const lerpFactor = Math.min(baseLerpFactor + shipSpeed / 10000, 0.3); // 最大跟随速度0.3
    const maxDistance = Math.max(500, shipSpeed * 0.5); // 根据速度调整最大距离，防止跟丢
    const distanceToShip = Math.sqrt(
      (this.ship.position.x - this.camera.x) ** 2 +
      (this.ship.position.y - this.camera.y) ** 2
    );

    if (distanceToShip > maxDistance) {
      // 如果距离太大，瞬间移动摄像头
      this.camera.x = this.ship.position.x;
      this.camera.y = this.ship.position.y;
    } else {
      // 平滑跟随
      this.camera.x += (this.ship.position.x - this.camera.x) * lerpFactor;
      this.camera.y += (this.ship.position.y - this.camera.y) * lerpFactor;
    }

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
          // 如果是Megastructure，触发穿透
          if (obj instanceof Megastructure) {
            const impactPoint = new Vector2(this.ship.position.x, this.ship.position.y);
            const impactForce = this.ship.velocity.length();
            (obj as Megastructure).penetrate(impactPoint, impactForce, this.lastTime);
          }
        } else if (obj.isEntered && obj.explosionTimer === 0) {
          // 飞船离开碰撞箱，开始爆炸定时器
          obj.explosionTimer = 0.5;
        }

        if (obj.explosionTimer > 0) {
          obj.explosionTimer -= deltaTime;
          if (obj.explosionTimer <= 0) {
            // 爆炸
            if (obj instanceof Megastructure) {
              (obj as Megastructure).explode(this);
            } else {
              this.createExplosion(obj.position.x, obj.position.y, obj.size);
            }
            return false; // 移除物体
          }
        }

        return true; // 保留物体
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
    this.speedDisplay.textContent = `Speed: ${this.ship.velocity.length().toFixed(1)} | Gear: ${this.ship.gear}`;
    this.objectsDisplay.textContent = `Objects: ${this.objects.length} | Ship: (${this.ship.position.x.toFixed(0)}, ${this.ship.position.y.toFixed(0)})`;
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
        const indicator = new DirectionIndicator(obj.position.x, obj.position.y, obj.type, distance, obj.size);
        this.directionIndicators.push(indicator);
      }
    });
  }

  // 触发屏幕震动
  triggerScreenShake(intensity: number, duration: number) {
    this.screenShakeIntensity = Math.max(this.screenShakeIntensity, intensity);
    this.screenShakeDuration = Math.max(this.screenShakeDuration, duration);
  }

  createExplosion(x: number, y: number, size: number) {
    // 触发屏幕震动
    const shakeIntensity = Math.min(size / 10, 50);
    const shakeDuration = Math.min(size / 100, 1.0);
    this.triggerScreenShake(shakeIntensity, shakeDuration);

    // 超大规模爆炸粒子效果 - 真正的冲击感
    const particleCount = Math.min(size * 5, 1000); // 大幅增加粒子数量
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.5;
      const speed = Math.random() * 600 + 300; // 更高的速度
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const life = Math.random() * 6 + 4; // 更长的生命周期
      const colors = ['#ff3300', '#ff6600', '#ffaa00', '#ffff00', '#ffffff', '#ff0088', '#ff4400', '#ff8800'];
      const color = colors[Math.floor(Math.random() * colors.length)];
      const particleSize = Math.random() * 15 + 5; // 更大的粒子

      // 随机选择粒子类型
      const types = ['normal', 'spark', 'debris'];
      const type = types[Math.floor(Math.random() * types.length)];

      const p = new Particle(x, y, vx, vy, life, color, particleSize, type);
      this.particles.push(p);
    }

    // 多重强大冲击波效果
    for (let i = 0; i < 5; i++) {
      const delay = i * 0.05;
      setTimeout(() => {
        const shockwaveSize = size / 2 * (1 + i * 0.8);
        const shockwave = new Particle(x, y, 0, 0, 3, '#ffffff', shockwaveSize, 'shockwave');
        this.particles.push(shockwave);
      }, delay * 1000);
    }

    // 增强火花效果 - 更密集更亮
    for (let i = 0; i < 80; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 400 + 150;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const spark = new Particle(x, y, vx, vy, Math.random() * 3 + 2, '#ffff88', 4, 'spark');
      this.particles.push(spark);
    }

    // 添加烟雾效果 - 更浓密
    for (let i = 0; i < 50; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 50 + 20;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const smoke = new Particle(x, y, vx, vy, Math.random() * 12 + 8, '#666666', Math.random() * 20 + 10, 'normal');
      this.particles.push(smoke);
    }

    // 添加闪光效果 - 瞬间亮光
    for (let i = 0; i < 10; i++) {
      const flash = new Particle(x, y, 0, 0, 0.3, '#ffffff', size * 2, 'normal');
      this.particles.push(flash);
    }
  }  generateNearbyRegions() {
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

  zoomOut() {
    this.zoom = Math.max(this.zoom * 0.9, 0.01);
  }

  zoomIn() {
    this.zoom = Math.min(this.zoom * 1.1, 1.0);
  }

  draw() {
    // 应用屏幕震动
    this.ctx.save();
    this.ctx.translate(this.screenShake.x, this.screenShake.y);

    // 简单的黑色背景
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // 绘制星星
    for (let i = 0; i < 100; i++) {
      const x = (i * 37) % this.canvas.width;
      const y = (i * 23) % this.canvas.height;
      this.ctx.fillStyle = '#ffffff';
      this.ctx.fillRect(x, y, 1, 1);
    }

    // 绘制物体
    this.objects.forEach(obj => {
      const relX = (obj.position.x - this.camera.x) * this.zoom + this.canvas.width / 2;
      const relY = (obj.position.y - this.camera.y) * this.zoom + this.canvas.height / 2;
      
      let cullSize = obj.size * this.zoom;
      if (obj instanceof Megastructure) {
        cullSize = Math.max(obj.size * this.zoom, 500);
      }
      
      if (relX > -cullSize && relX < this.canvas.width + cullSize &&
          relY > -cullSize && relY < this.canvas.height + cullSize) {
        obj.draw(this.ctx, relX, relY, this.zoom);
      }
    });

    // 绘制方向指示器
    this.directionIndicators.forEach(indicator => {
      indicator.draw(this.ctx, this.ship.position, this.camera, this.canvas.width, this.canvas.height);
    });

    // 绘制粒子
    this.particles.forEach(p => {
      const relX = (p.position.x - this.camera.x) * this.zoom + this.canvas.width / 2;
      const relY = (p.position.y - this.camera.y) * this.zoom + this.canvas.height / 2;
      p.draw(this.ctx, relX, relY, this.zoom);
    });

    // 绘制飞船
    const shipRelX = (this.ship.position.x - this.camera.x) * this.zoom + this.canvas.width / 2;
    const shipRelY = (this.ship.position.y - this.camera.y) * this.zoom + this.canvas.height / 2;
    this.ship.draw(this.ctx, shipRelX, shipRelY, this.zoom);

    this.ctx.restore();
  }

  gameLoop(currentTime: number) {
    const deltaTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    this.update(deltaTime);
    this.draw();

    requestAnimationFrame((time) => this.gameLoop(time));
  }
}
