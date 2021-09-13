export interface Coords {
  x: number;
  y: number;
}

export class Point implements Coords {
  constructor(public x = 0, public y = 0) {}
}

export class Size {
  width = 0;
  height = 0;
  constructor(w = 0, h = 0) {
    this.width = w;
    this.height = h;
  }
}

export class Insets {
  constructor(public left = 0, public top = 0, public right = 0, public bottom = 0) {}
}

export interface BBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class Rect implements BBox {
  constructor(public x = 0, public y = 0, public width = 0, public height = 0) {}

  static from(box: BBox): Rect {
    return new Rect(box.x, box.y, box.width, box.height);
  }

  copy(): Rect {
    return Rect.from(this);
  }

  union(another: BBox): this {
    if (another) {
      const minX = Math.min(this.x, another.x);
      const minY = Math.min(this.y, another.y);
      const maxX = Math.max(this.x + this.width, another.x + another.width);
      const maxY = Math.max(this.y + this.height, another.y + another.height);
      this.x = minX;
      this.y = minY;
      this.width = maxX - minX;
      this.height = maxY - minY;
    }
    return this;
  }
}
