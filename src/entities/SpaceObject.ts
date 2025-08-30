import { Vector2 } from './Vector2';

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
