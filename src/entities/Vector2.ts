export class Vector2 {
  x: number;
  y: number;

  constructor(x: number = 0, y: number = 0) {
    this.x = x;
    this.y = y;
  }

  add(v: Vector2): Vector2 {
    return new Vector2(this.x + v.x, this.y + v.y);
  }

  multiply(scalar: number): Vector2 {
    return new Vector2(this.x * scalar, this.y * scalar);
  }

  length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  // 添加坐标归一化方法，处理大尺度坐标
  normalize(scale: number = 1e6): Vector2 {
    return new Vector2(
      Math.round(this.x / scale) * scale,
      Math.round(this.y / scale) * scale
    );
  }

  // 计算区域键，用于分区域生成
  getRegionKey(regionSize: number = 10000): string {
    const regionX = Math.floor(this.x / regionSize);
    const regionY = Math.floor(this.y / regionSize);
    return `${regionX},${regionY}`;
  }
}
