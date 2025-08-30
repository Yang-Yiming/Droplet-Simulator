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

  draw(ctx: CanvasRenderingContext2D, x: number, y: number) {
    const alpha = this.life / this.maxLife;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;

    if (this.type === 'spark') {
      // Draw spark as a small glowing circle
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 5;
      ctx.beginPath();
      ctx.arc(x, y, this.size * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    } else if (this.type === 'debris') {
      // Draw debris as irregular shapes
      ctx.fillRect(x - this.size * 0.5, y - this.size * 0.5, this.size, this.size);
    } else if (this.type === 'shockwave') {
      // Draw shockwave as expanding ring
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, this.size * (1 - alpha) * 10, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      // Normal particles
      ctx.fillRect(x - this.size * 0.5, y - this.size * 0.5, this.size, this.size);
    }

    ctx.globalAlpha = 1;
  }
}
