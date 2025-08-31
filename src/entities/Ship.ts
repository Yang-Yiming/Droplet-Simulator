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
  maxGear: number = 8; // 从5档增加到8档 - 水滴级
  gearThresholds: number[] = [200, 400, 700, 1100, 1600, 2200, 2900, 3700]; // 水滴级速度阈值
  flashing: boolean = false; // 是否闪烁
  flashTimer: number = 0; // 闪烁定时器
  lastJKeyState: boolean = false; // 上一帧J键状态，用于检测按键释放
  baseAcceleration: number = 800; // 从300大幅提升到800 - 水滴级加速度
  baseMaxSpeed: number = 1500; // 从500大幅提升到1500 - 水滴级速度
  maneuverability: number = 2.5; // 新增机动性系数 - 水滴级转向能力
  inertialDamping: number = 0.95; // 从0.99降低到0.95 - 更强的惯性控制
  highPerformanceMode: boolean = false; // 高性能模式 - 当达到高档位时激活

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

    // 高性能模式激活 - 水滴级
    this.highPerformanceMode = this.gear >= 6; // 6档及以上激活高性能模式

    // Gear management - 水滴级
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

    // Ship controls - 舒适水滴级控制系统
    const accelerationMultiplier = this.isDropletMode ? 6 : (this.highPerformanceMode ? 2.5 : 1);
    const maneuverMultiplier = this.isDropletMode ? 2.2 : (this.highPerformanceMode ? 1.8 : 1);

    // 计算基础推力
    const thrustForce = new Vector2();
    if (keys['ArrowUp'] || keys['KeyW']) thrustForce.y -= this.baseAcceleration;
    if (keys['ArrowDown'] || keys['KeyS']) thrustForce.y += this.baseAcceleration;
    if (keys['ArrowLeft'] || keys['KeyA']) thrustForce.x -= this.baseAcceleration;
    if (keys['ArrowRight'] || keys['KeyD']) thrustForce.x += this.baseAcceleration;

    // 应用档位和加速倍数
    const finalThrustForce = thrustForce.multiply(this.gear * accelerationMultiplier);
    this.applyForce(finalThrustForce);

    // 舒适转向系统 - 重新设计
    const turningSpeed = this.velocity.length();
    if (turningSpeed > 20) { // 低速阈值降低
      const normalizedVelocity = new Vector2(
        this.velocity.x / turningSpeed,
        this.velocity.y / turningSpeed
      );

      // 计算期望的转向方向
      const desiredDirection = new Vector2();
      if (keys['ArrowLeft'] || keys['KeyA']) desiredDirection.x -= 1;
      if (keys['ArrowRight'] || keys['KeyD']) desiredDirection.x += 1;
      if (keys['ArrowUp'] || keys['KeyW']) desiredDirection.y -= 1;
      if (keys['ArrowDown'] || keys['KeyS']) desiredDirection.y += 1;

      if (desiredDirection.length() > 0) {
        // 归一化期望方向
        const normalizedDesired = new Vector2(
          desiredDirection.x / desiredDirection.length(),
          desiredDirection.y / desiredDirection.length()
        );

        // 计算当前速度方向和期望方向之间的夹角
        const dotProduct = Math.max(-1, Math.min(1,
          normalizedVelocity.x * normalizedDesired.x + normalizedVelocity.y * normalizedDesired.y
        ));
        const angleDifference = Math.acos(dotProduct);

        // 计算转向方向（叉积）
        const crossProduct = normalizedVelocity.x * normalizedDesired.y - normalizedVelocity.y * normalizedDesired.x;

        // 舒适转向力计算
        // 1. 基础转向力 - 根据速度调整
        const baseTurningForce = Math.min(300, 150 + turningSpeed * 0.8);

        // 2. 角度影响 - 角度越大，转向力越强，但有上限
        const angleMultiplier = Math.min(2.0, angleDifference / (Math.PI / 4)); // 45度为上限

        // 3. 速度影响 - 高速时转向力相对减弱，但绝对值增加
        const speedMultiplier = Math.max(0.6, Math.min(1.8, 300 / turningSpeed));

        // 4. 档位和模式影响
        const gearMultiplier = Math.sqrt(this.gear) * maneuverMultiplier;

        // 最终转向力
        const turningStrength = baseTurningForce * angleMultiplier * speedMultiplier * gearMultiplier;

        // 创建转向力（垂直于当前速度）
        const perpendicularVector = new Vector2(-normalizedVelocity.y, normalizedVelocity.x);
        const turningForce = perpendicularVector.multiply(turningStrength * Math.sign(crossProduct));

        // 添加转向阻尼 - 防止过度转向
        const turningDamping = Math.min(0.3, angleDifference / Math.PI);
        const dampedTurningForce = turningForce.multiply(1 - turningDamping * 0.5);

        this.applyForce(dampedTurningForce);

        // 轻微的直接推力辅助（只在角度较大时）
        if (angleDifference > Math.PI / 6) { // 30度以上
          const directAssistForce = normalizedDesired.multiply(50 * maneuverMultiplier);
          this.applyForce(directAssistForce);
        }
      }
    }

    // 水滴级速度和惯性控制
    this.velocity = this.velocity.add(this.acceleration.multiply(deltaTime));

    // 智能速度限制 - 水滴级
    const currentSpeedNow = this.velocity.length();
    if (currentSpeedNow > this.maxSpeed) {
      // 平滑的速度限制，而不是硬限制
      const speedRatio = this.maxSpeed / currentSpeedNow;
      this.velocity = this.velocity.multiply(speedRatio * 0.98 + 0.02); // 98%目标速度 + 2%平滑过渡
    }

    // 增强惯性阻尼控制 - 水滴级
    const dampingFactor = this.isDropletMode ? 0.90 : this.inertialDamping; // 水滴模式下更强的阻尼
    this.velocity = this.velocity.multiply(dampingFactor);

    // 水滴级位置更新
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
    
    // 水滴模式时的发光效果 - 增强版
    if (this.isDropletMode) {
      // 多层发光效果 - 水滴的能量场
      const energyLayers = 4;
      for (let i = 0; i < energyLayers; i++) {
        const layerRadius = baseRadius + (i + 1) * 8 * zoom + Math.sin(this.dropletTimer * 25 + i * 0.5) * 3 * zoom;
        const alpha = (0.8 - i * 0.15) * (0.3 + 0.7 * Math.sin(this.dropletTimer * 30 + i));
        const gradient = ctx.createRadialGradient(x, y, baseRadius, x, y, layerRadius);
        gradient.addColorStop(0, `rgba(0, 136, 255, ${alpha})`);
        gradient.addColorStop(0.6, `rgba(0, 136, 255, ${alpha * 0.4})`);
        gradient.addColorStop(1, 'rgba(0, 136, 255, 0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, layerRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      // 核心能量球 - 水滴的核心
      const coreGradient = ctx.createRadialGradient(x, y, 0, x, y, baseRadius * 1.5);
      coreGradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
      coreGradient.addColorStop(0.5, 'rgba(0, 136, 255, 0.8)');
      coreGradient.addColorStop(1, 'rgba(0, 136, 255, 0.3)');

      ctx.fillStyle = coreGradient;
      ctx.beginPath();
      ctx.arc(x, y, baseRadius * 1.2, 0, Math.PI * 2);
      ctx.fill();

      // 高速时的尾迹效果
      if (this.velocity.length() > 300) {
        const trailLength = Math.min(this.velocity.length() / 50, 50);
        const trailGradient = ctx.createLinearGradient(
          x, y,
          x - this.velocity.x / this.velocity.length() * trailLength * zoom,
          y - this.velocity.y / this.velocity.length() * trailLength * zoom
        );
        trailGradient.addColorStop(0, 'rgba(0, 136, 255, 0.6)');
        trailGradient.addColorStop(1, 'rgba(0, 136, 255, 0)');

        ctx.fillStyle = trailGradient;
        ctx.beginPath();
        ctx.arc(x, y, baseRadius * 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
      
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
      
    } else if (this.highPerformanceMode) {
      // 高性能模式 - 水滴级能量场
      const performanceGlowRadius = baseRadius + 12 * zoom;
      const performanceGradient = ctx.createRadialGradient(x, y, baseRadius, x, y, performanceGlowRadius);
      performanceGradient.addColorStop(0, 'rgba(255, 100, 0, 0.7)'); // 橙色能量
      performanceGradient.addColorStop(0.5, 'rgba(255, 200, 0, 0.4)');
      performanceGradient.addColorStop(1, 'rgba(255, 100, 0, 0)');
      
      ctx.fillStyle = performanceGradient;
      ctx.beginPath();
      ctx.arc(x, y, performanceGlowRadius, 0, Math.PI * 2);
      ctx.fill();
      
      // 高性能核心
      ctx.fillStyle = '#ffaa00';
      ctx.beginPath();
      ctx.arc(x, y, baseRadius * 1.1, 0, Math.PI * 2);
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
