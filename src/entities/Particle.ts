import { Vector2 } from './Vector2';

export class Particle {
  position: Vector2;
  velocity: Vector2;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  type: string; // 'normal', 'spark', 'debris', 'shockwave'

  constructor(x: number, y: number, vx: number, vy: number, life: number, color: string, size: number = 2, type: string = 'normal') {
    this.position = new Vector2(x, y);
    this.velocity = new Vector2(vx, vy);
    this.life = life;
    this.maxLife = life;
    this.color = color;
    this.size = size;
    this.type = type;
  }

  update(deltaTime: number) {
    this.position = this.position.add(this.velocity.multiply(deltaTime));
    this.life -= deltaTime;

    // Add some physics effects
    if (this.type === 'spark') {
      // Sparks slow down over time
      this.velocity = this.velocity.multiply(0.98);
    } else if (this.type === 'debris') {
      // Debris falls down slightly
      this.velocity.y += 50 * deltaTime;
    }
  }

  draw(ctx: CanvasRenderingContext2D, x: number, y: number, zoom: number = 1) {
    const alpha = this.life / this.maxLife;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;

    if (this.type === 'spark') {
      // 简单的圆形火花
      ctx.beginPath();
      ctx.arc(x, y, this.size * 0.5 * zoom, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.type === 'debris') {
      // 简单的矩形碎片
      ctx.fillRect(x - (this.size * 0.5 * zoom), y - (this.size * 0.5 * zoom), this.size * zoom, this.size * zoom);
    } else if (this.type === 'shockwave') {
      // 增强的冲击波效果 - 更震撼
      const waveAlpha = alpha * 0.8;
      ctx.strokeStyle = `rgba(255, 255, 255, ${waveAlpha})`;
      ctx.lineWidth = (4 + (1 - alpha) * 8) * zoom; // 线条随时间变粗
      ctx.beginPath();
      ctx.arc(x, y, this.size * (1 - alpha) * 15 * zoom, 0, Math.PI * 2);
      ctx.stroke();
      
      // 添加内圈光晕
      ctx.strokeStyle = `rgba(255, 200, 100, ${waveAlpha * 0.6})`;
      ctx.lineWidth = (2 + (1 - alpha) * 4) * zoom;
      ctx.beginPath();
      ctx.arc(x, y, this.size * (1 - alpha) * 12 * zoom, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      // 简单的矩形粒子
      ctx.fillRect(x - (this.size * 0.5 * zoom), y - (this.size * 0.5 * zoom), this.size * zoom, this.size * zoom);
    }

    ctx.globalAlpha = 1;
  }
}
