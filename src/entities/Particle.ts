import { Vector2 } from './Vector2';

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
