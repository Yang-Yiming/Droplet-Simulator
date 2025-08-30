import { Vector2 } from './Vector2';

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
