import { Vector2 } from './Vector2';

export class Ship {
  position: Vector2;
  velocity: Vector2;
  acceleration: Vector2;
  size: number;
  maxSpeed: number;
  isDropletMode: boolean = false; // 水滴模式
  dropletTimer: number = 0; // 水滴模式持续时间
  gear: number = 1; // 当前档位
  maxGear: number = 5; // 最大档位
  gearThresholds: number[] = [100, 200, 300, 400, 500]; // 速度阈值
  flashing: boolean = false; // 是否闪烁
  flashTimer: number = 0; // 闪烁定时器
  lastJKeyState: boolean = false; // 上一帧J键状态，用于检测按键释放
  baseAcceleration: number = 300; // 基础加速度
  baseMaxSpeed: number = 500; // 基础最大速度

  constructor(x: number, y: number) {
    this.position = new Vector2(x, y);
    this.velocity = new Vector2();
    this.acceleration = new Vector2();
    this.size = 100; // 飞船长度100m
    this.maxSpeed = this.baseMaxSpeed * this.gear; // 设置最大速度
  }

  update(deltaTime: number, keys: { [key: string]: boolean }) {
    // Check for droplet mode activation
    if (keys['ShiftLeft'] || keys['ShiftRight']) {
      this.isDropletMode = true;
      this.dropletTimer = 0.5; // 0.5 seconds of droplet mode
      // 水滴模式只增加加速度，不增加速度上限
    }

    // Update droplet timer
    if (this.dropletTimer > 0) {
      this.dropletTimer -= deltaTime;
      if (this.dropletTimer <= 0) {
        this.isDropletMode = false;
        this.maxSpeed = this.baseMaxSpeed * this.gear; // Reset speed
      }
    }

    // Gear management
    const currentSpeed = this.velocity.length();
    if (currentSpeed >= this.gearThresholds[this.gear - 1] && this.gear < this.maxGear) {
      this.flashing = true;
      this.flashTimer = 0.5; // Flash for 0.5 seconds
    }

    // Auto downshift if speed drops below threshold
    if (this.gear > 1 && currentSpeed < this.gearThresholds[this.gear - 2]) {
      this.gear--;
      this.maxSpeed = this.baseMaxSpeed * this.gear;
    }

    // Manual upshift with J key (detect key release to prevent multiple shifts)
    if (!keys['KeyJ'] && this.lastJKeyState && this.flashing) {
      this.gear = Math.min(this.gear + 1, this.maxGear);
      this.maxSpeed = this.baseMaxSpeed * this.gear;
      this.flashing = false;
      this.flashTimer = 0;
    }
    this.lastJKeyState = keys['KeyJ'];

    // Update flash timer
    if (this.flashTimer > 0) {
      this.flashTimer -= deltaTime;
      if (this.flashTimer <= 0) {
        this.flashing = false;
      }
    }

    // Ship controls
    const accelerationMultiplier = this.isDropletMode ? 4 : 1; // 水滴模式下加速度4倍
    const force = new Vector2();
    if (keys['ArrowUp'] || keys['KeyW']) force.y -= this.baseAcceleration * this.gear * accelerationMultiplier;
    if (keys['ArrowDown'] || keys['KeyS']) force.y += this.baseAcceleration * this.gear * accelerationMultiplier;
    if (keys['ArrowLeft'] || keys['KeyA']) force.x -= this.baseAcceleration * this.gear * accelerationMultiplier;
    if (keys['ArrowRight'] || keys['KeyD']) force.x += this.baseAcceleration * this.gear * accelerationMultiplier;
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

  draw(ctx: CanvasRenderingContext2D, x: number, y: number, zoom: number = 1) {
    ctx.save();
    
    // 飞船始终是圆形
    const baseRadius = 10 * zoom;
    
    // 水滴模式时的发光效果
    if (this.isDropletMode) {
      // 外圈发光效果
      const glowRadius = baseRadius + 5 * zoom + Math.sin(this.dropletTimer * 20) * 2 * zoom; // 动态发光
      const gradient = ctx.createRadialGradient(x, y, baseRadius, x, y, glowRadius);
      gradient.addColorStop(0, 'rgba(0, 136, 255, 0.8)');
      gradient.addColorStop(0.7, 'rgba(0, 136, 255, 0.3)');
      gradient.addColorStop(1, 'rgba(0, 136, 255, 0)');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, glowRadius, 0, Math.PI * 2);
      ctx.fill();
      
      // 内圈飞船本体
      ctx.fillStyle = '#00ff00';
      ctx.beginPath();
      ctx.arc(x, y, baseRadius, 0, Math.PI * 2);
      ctx.fill();
      
    } else if (this.flashing) {
      // 换挡时的黄光效果
      const yellowGlowRadius = baseRadius + 8 * zoom;
      const yellowGradient = ctx.createRadialGradient(x, y, baseRadius, x, y, yellowGlowRadius);
      yellowGradient.addColorStop(0, 'rgba(255, 255, 0, 0.6)');
      yellowGradient.addColorStop(0.8, 'rgba(255, 255, 0, 0.2)');
      yellowGradient.addColorStop(1, 'rgba(255, 255, 0, 0)');
      
      ctx.fillStyle = yellowGradient;
      ctx.beginPath();
      ctx.arc(x, y, yellowGlowRadius, 0, Math.PI * 2);
      ctx.fill();
      
      // 内圈飞船本体
      ctx.fillStyle = '#00ff00';
      ctx.beginPath();
      ctx.arc(x, y, baseRadius, 0, Math.PI * 2);
      ctx.fill();
      
    } else {
      // 正常状态：绿色圆形飞船
      ctx.fillStyle = '#00ff00';
      ctx.beginPath();
      ctx.arc(x, y, baseRadius, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.restore();
  }
}
