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
}
