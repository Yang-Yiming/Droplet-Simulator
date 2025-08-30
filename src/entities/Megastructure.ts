import { Vector2 } from './Vector2';
import { SpaceObject } from './SpaceObject';
import { Particle } from './Particle';

export class Megastructure extends SpaceObject {
  imageData: ImageData | null = null;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  isDestroyed: boolean = false;
  fragments: MegastructureFragment[] = [];
  chunkSize: number = 100; // 像素块大小，用于优化
  lastDamageTime: number = 0; // 上次破坏时间，用于优化
  damageCooldown: number = 0.1; // 破坏冷却时间

  constructor(x: number, y: number, vx: number, vy: number, size: number, color: string, type: string) {
    super(x, y, vx, vy, size, color, type);
    // 增加Canvas大小，但使用分块优化
    const maxCanvasSize = 2000; // 允许更大的Canvas
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
    this.canvas.width = Math.min(size * 2, maxCanvasSize);
    this.canvas.height = Math.min(size * 2, maxCanvasSize);
    this.generateStructure();
  }

  generateStructure() {
    // 清空Canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    if (this.type === 'megaship') {
      this.generateBattleship();
    } else if (this.type === 'megaplanet') {
      this.generatePlanet();
    }
    
    this.imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
  }

  private generateBattleship() {
    const width = this.canvas.width;
    const height = this.canvas.height;
    
    // 简单的矩形战舰
    this.ctx.fillStyle = this.color;
    this.ctx.fillRect(width * 0.1, height * 0.3, width * 0.8, height * 0.4);
  }

  private generatePlanet() {
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    const radius = Math.min(this.size, this.canvas.width / 2);
    
    // 简单的圆形行星
    this.ctx.fillStyle = this.color;
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    this.ctx.fill();
  }



  update(deltaTime: number) {
    super.update(deltaTime);
    this.lastDamageTime += deltaTime; // 更新破坏冷却
    // 更新碎片
    this.fragments.forEach(fragment => fragment.update(deltaTime));
    this.fragments = this.fragments.filter(fragment => fragment.life > 0);
  }

  draw(ctx: CanvasRenderingContext2D, x: number, y: number) {
    if (this.isDestroyed) {
      // 绘制碎片
      this.fragments.forEach(fragment => {
        const relX = fragment.position.x - this.position.x + x;
        const relY = fragment.position.y - this.position.y + y;
        fragment.draw(ctx, relX, relY);
      });
    } else {
      // 分块渲染优化 - 只渲染可见部分
      if (this.imageData) {
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d')!;
        tempCanvas.width = this.canvas.width;
        tempCanvas.height = this.canvas.height;
        tempCtx.putImageData(this.imageData, 0, 0);
        ctx.drawImage(tempCanvas, x - this.canvas.width / 2, y - this.canvas.height / 2);
      }
    }
  }

  // 像素级破坏逻辑 - 真正的物理模拟
  penetrate(impactPoint: Vector2, impactForce: number, currentTime: number) {
    if (this.isDestroyed || currentTime - this.lastDamageTime < this.damageCooldown) return;

    this.lastDamageTime = currentTime;

    if (this.imageData) {
      const localX = impactPoint.x - this.position.x + this.canvas.width / 2;
      const localY = impactPoint.y - this.position.y + this.canvas.height / 2;
      const radius = Math.min(impactForce / 5, 30); // 破坏半径基于冲击力

      // 创建破坏区域
      const destroyedPixels: {x: number, y: number}[] = [];
      
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance <= radius) {
            const px = Math.floor(localX + dx);
            const py = Math.floor(localY + dy);
            if (px >= 0 && px < this.canvas.width && py >= 0 && py < this.canvas.height) {
              const index = (py * this.canvas.width + px) * 4;
              if (this.imageData.data[index + 3] > 0) { // 只破坏不透明像素
                // 概率性破坏 - 中心更易破坏
                const destructionProb = 1 - (distance / radius) * 0.5;
                if (Math.random() < destructionProb) {
                  this.imageData.data[index + 3] = 0; // 设置为透明
                  destroyedPixels.push({x: px, y: py});
                }
              }
            }
          }
        }
      }

      // 创建碎片粒子
      destroyedPixels.forEach(pixel => {
        if (Math.random() < 0.1) { // 只为10%的破坏像素创建碎片
          const worldX = this.position.x + pixel.x - this.canvas.width / 2;
          const worldY = this.position.y + pixel.y - this.canvas.height / 2;
          const fragment = new MegastructureFragment(
            worldX, worldY,
            (Math.random() - 0.5) * 200,
            (Math.random() - 0.5) * 200,
            this.color,
            Math.random() * 2 + 1
          );
          this.fragments.push(fragment);
        }
      });

      // 检查是否需要完全破坏
      if (this.getIntactPixels() < this.canvas.width * this.canvas.height * 0.3) {
        this.isDestroyed = true;
      }
    }
  }

  // 爆炸 - 完全摧毁
  explode(game: any) {
    if (this.isDestroyed) return;

    this.isDestroyed = true;
    
    // 创建大规模爆炸粒子
    const explosionX = this.position.x;
    const explosionY = this.position.y;
    const particleCount = Math.min(this.size, 500);
    
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.5;
      const speed = Math.random() * 600 + 300;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const life = Math.random() * 4 + 3;
      const colors = ['#ff3300', '#ff6600', '#ffaa00', '#ffff00', '#ffffff'];
      const color = colors[Math.floor(Math.random() * colors.length)];
      const particleSize = Math.random() * 8 + 3;
      game.particles.push(new Particle(explosionX, explosionY, vx, vy, life, color, particleSize, 'normal'));
    }

    // 创建碎片
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * this.size;
      const fragmentX = explosionX + Math.cos(angle) * distance;
      const fragmentY = explosionY + Math.sin(angle) * distance;
      const fragment = new MegastructureFragment(
        fragmentX, fragmentY,
        Math.cos(angle) * 300 + (Math.random() - 0.5) * 100,
        Math.sin(angle) * 300 + (Math.random() - 0.5) * 100,
        this.color,
        Math.random() * 3 + 2
      );
      this.fragments.push(fragment);
    }
  }

  // 获取完整像素数量
  private getIntactPixels(): number {
    if (!this.imageData) return 0;
    let count = 0;
    for (let i = 3; i < this.imageData.data.length; i += 4) {
      if (this.imageData.data[i] > 0) count++;
    }
    return count;
  }
}

// 碎片类 - 改进的物理
class MegastructureFragment {
  position: Vector2;
  velocity: Vector2;
  color: string;
  life: number;
  maxLife: number;
  rotation: number = 0;
  rotationSpeed: number = 0;

  constructor(x: number, y: number, vx: number, vy: number, color: string, life: number) {
    this.position = new Vector2(x, y);
    this.velocity = new Vector2(vx, vy);
    this.color = color;
    this.life = life;
    this.maxLife = life;
    this.rotationSpeed = (Math.random() - 0.5) * 10; // 随机旋转
  }

  update(deltaTime: number) {
    this.position = this.position.add(this.velocity.multiply(deltaTime));
    this.rotation += this.rotationSpeed * deltaTime;
    this.life -= deltaTime;
    
    // 重力和空气阻力
    this.velocity.y += 50 * deltaTime; // 重力
    this.velocity = this.velocity.multiply(0.98); // 空气阻力
  }

  draw(ctx: CanvasRenderingContext2D, x: number, y: number) {
    const alpha = this.life / this.maxLife;
    ctx.globalAlpha = alpha;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(this.rotation);
    ctx.fillStyle = this.color;
    ctx.fillRect(-8, -8, 16, 16); // 旋转的碎片
    ctx.restore();
    ctx.globalAlpha = 1;
  }
}
