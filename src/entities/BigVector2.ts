import { Vector2 } from './Vector2';

// 高级坐标系统 - 支持无限宇宙
export class BigVector2 {
  x: bigint;
  y: bigint;

  constructor(x: bigint | number = 0n, y: bigint | number = 0n) {
    this.x = typeof x === 'number' ? BigInt(Math.round(x)) : x;
    this.y = typeof y === 'number' ? BigInt(Math.round(y)) : y;
  }

  add(v: BigVector2): BigVector2 {
    return new BigVector2(this.x + v.x, this.y + v.y);
  }

  multiply(scalar: bigint | number): BigVector2 {
    const s = typeof scalar === 'number' ? BigInt(Math.round(scalar)) : scalar;
    return new BigVector2(this.x * s, this.y * s);
  }

  length(): number {
    const x = Number(this.x);
    const y = Number(this.y);
    return Math.sqrt(x * x + y * y);
  }

  // 转换为普通Vector2（用于渲染）
  toVector2(): Vector2 {
    return new Vector2(Number(this.x), Number(this.y));
  }

  // 从普通Vector2转换
  static fromVector2(v: Vector2): BigVector2 {
    return new BigVector2(BigInt(Math.round(v.x)), BigInt(Math.round(v.y)));
  }

  // 计算区域键
  getRegionKey(regionSize: bigint = 10000n): string {
    const regionX = this.x / regionSize;
    const regionY = this.y / regionSize;
    return `${regionX},${regionY}`;
  }
}
