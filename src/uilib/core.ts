
export class Point {
  x = 0;
  y = 0;
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }
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
  left: number;
  top: number;
  right: number;
  bottom: number;
  constructor(left = 0, top = 0, right = 0, bottom = 0) {
    this.left = left;
    this.top = top;
    this.right = right;
    this.bottom = bottom;
  }
}

export class Rect {
  x = 0;
  y = 0;
  width = 0;
  height = 0;
  constructor(x = 0, y = 0, w = 0, h = 0) {
    this.x = x;
    this.y = y;
    this.width = w;
    this.height = h;
  }
}
