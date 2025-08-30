import { Vector2 } from './Vector2';

export class DirectionIndicator {
  targetPosition: Vector2;
  type: string;
  distance: number;

  constructor(targetX: number, targetY: number, type: string, distance: number) {
    this.targetPosition = new Vector2(targetX, targetY);
    this.type = type;
    this.distance = distance;
  }

  draw(ctx: CanvasRenderingContext2D, shipPosition: Vector2, camera: Vector2, canvasWidth: number, canvasHeight: number) {
    const dx = this.targetPosition.x - shipPosition.x;
    const dy = this.targetPosition.y - shipPosition.y;
    const angle = Math.atan2(dy, dx);

    // Calculate color based on distance (red = close, blue = far)
    const normalizedDistance = Math.min(this.distance / 10000, 1); // 10km max
    const red = Math.floor(255 * normalizedDistance);
    const blue = Math.floor(255 * (1 - normalizedDistance));
    const color = `rgb(${red}, 0, ${blue})`;

    // Draw direction arrow on screen edge
    const arrowLength = 30;
    const arrowDistance = Math.min(canvasWidth, canvasHeight) / 2 - 50;

    let arrowX = canvasWidth / 2 + Math.cos(angle) * arrowDistance;
    let arrowY = canvasHeight / 2 + Math.sin(angle) * arrowDistance;

    // If target is on screen, don't show arrow
    const screenX = this.targetPosition.x - camera.x + canvasWidth / 2;
    const screenY = this.targetPosition.y - camera.y + canvasHeight / 2;
    const onScreen = screenX >= 0 && screenX <= canvasWidth && screenY >= 0 && screenY <= canvasHeight;

    if (!onScreen) {
      // Draw arrow pointing to target
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath();

      // Arrow shaft
      const shaftStartX = canvasWidth / 2 + Math.cos(angle) * (arrowDistance - arrowLength);
      const shaftStartY = canvasHeight / 2 + Math.sin(angle) * (arrowDistance - arrowLength);
      const shaftEndX = canvasWidth / 2 + Math.cos(angle) * arrowDistance;
      const shaftEndY = canvasHeight / 2 + Math.sin(angle) * arrowDistance;

      ctx.moveTo(shaftStartX, shaftStartY);
      ctx.lineTo(shaftEndX, shaftEndY);

      // Arrow head
      const headAngle1 = angle + Math.PI / 6;
      const headAngle2 = angle - Math.PI / 6;
      const headLength = 10;

      ctx.moveTo(shaftEndX, shaftEndY);
      ctx.lineTo(
        shaftEndX - Math.cos(headAngle1) * headLength,
        shaftEndY - Math.sin(headAngle1) * headLength
      );

      ctx.moveTo(shaftEndX, shaftEndY);
      ctx.lineTo(
        shaftEndX - Math.cos(headAngle2) * headLength,
        shaftEndY - Math.sin(headAngle2) * headLength
      );

      ctx.stroke();

      // Draw distance text
      ctx.fillStyle = color;
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      const distanceText = `${(this.distance / 1000).toFixed(1)}km`;
      ctx.fillText(distanceText, shaftEndX, shaftEndY - 15);
    }

    // Draw target type icon
    if (this.type === 'asteroid') {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(arrowX, arrowY, 5, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.type === 'starship') {
      ctx.fillStyle = color;
      ctx.fillRect(arrowX - 6, arrowY - 3, 12, 6);
    }
  }
}
