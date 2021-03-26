import { View } from "./View";
import { Size } from "./core";
import { DefaultLayoutManager } from "./Layouts";

export enum FlowAlignType {
  /**
   * Justify each each row of components
   * should be left-justified.
   */
  LEFT = 0,

  /**
   * This value indicates that each row of components
   * should be centered.
   */
  CENTER = 1,

  /**
   * This value indicates that each row of components
   * should be right-justified.
   */
  RIGHT = 2,

  /**
   * This value indicates that each row of components
   * should be justified to the leading edge of the container's
   * orientation, for example, to the left in left-to-right orientations.
   */
  LEADING = 3,

  /**
   * This value indicates that each row of components
   * should be justified to the trailing edge of the container's
   * orientation, for example, to the right in left-to-right orientations.
   */
  TRAILING = 4,
}

export class FlowLayout extends DefaultLayoutManager {
  /*
   * Alignment property that determines how each row distributes empty space.
   */
  readonly alignment: FlowAlignType;

  /**
   * The flow layout manager allows a seperation of
   * components with gaps.  The horizontal gap will
   * specify the space between components and between
   * the components and the borders of the
   * <code>Container</code>.
   */
  readonly hgap: number;

  /**
   * The flow layout manager allows a seperation of
   * components with gaps.  The vertical gap will
   * specify the space between rows and between the
   * the rows and the borders of the <code>Container</code>.
   */
  readonly vgap: number;

  /**
   * If true, components will be aligned on their baseline.
   */
  readonly alignOnBaseline: boolean;

  /**
   * Whether to layout left to right or right to left.
   */
  readonly leftToRight: boolean;

  /**
   * Creates a new flow layout manager with the indicated alignment
   * and the indicated horizontal and vertical gaps.
   */
  constructor(align = FlowAlignType.CENTER, hgap = 0, vgap = 0, alignOnBaseline = false, leftToRight = true) {
    super();
    this.hgap = hgap;
    this.vgap = vgap;
    this.alignment = align;
    this.alignOnBaseline = alignOnBaseline;
    this.leftToRight = leftToRight;
  }

  /**
   * Returns the min size of a view whose is layout is being managed by us.
   */
  minLayoutSize(parentView: View): Size {
    const useBaseline = this.alignOnBaseline;
    const dim = new Size(0, 0);
    const nmembers = parentView.childViewCount;
    let maxAscent = 0;
    let maxDescent = 0;
    let firstVisibleComponent = true;

    for (let i = 0; i < nmembers; i++) {
      const child = parentView.childAtIndex(i);
      if (child.isVisible) {
        const d = child.minSize;
        dim.height = Math.max(dim.height, d.height);
        if (firstVisibleComponent) {
          firstVisibleComponent = false;
        } else {
          dim.width += this.hgap;
        }
        dim.width += d.width;
        if (useBaseline) {
          const baseline = child.getBaseline(d.width, d.height);
          if (baseline >= 0) {
            maxAscent = Math.max(maxAscent, baseline);
            maxDescent = Math.max(maxDescent, dim.height - baseline);
          }
        }
      }
    }

    if (useBaseline) {
      dim.height = Math.max(maxAscent + maxDescent, dim.height);
    }

    const insets = parentView.insets;
    dim.width += insets.left + insets.right + this.hgap * 2;
    dim.height += insets.top + insets.bottom + this.vgap * 2;
    return dim;
  }

  /**
   * Returns the pref size of a view whose layout is being managed by us.
   */
  prefLayoutSize(parentView: View): Size {
    const dim = new Size();
    const nmembers = parentView.childViewCount;
    let firstVisibleComponent = true;
    const useBaseline = this.alignOnBaseline;
    let maxAscent = 0;
    let maxDescent = 0;

    for (let i = 0; i < nmembers; i++) {
      const child = parentView.childAtIndex(i);
      if (child.isVisible) {
        const d = child.prefSize;
        dim.height = Math.max(dim.height, d.height);
        if (firstVisibleComponent) {
          firstVisibleComponent = false;
        } else {
          dim.width += this.hgap;
        }
        dim.width += d.width;
        if (useBaseline) {
          const baseline = child.getBaseline(d.width, d.height);
          if (baseline >= 0) {
            maxAscent = Math.max(maxAscent, baseline);
            maxDescent = Math.max(maxDescent, d.height - baseline);
          }
        }
      }
    }
    if (useBaseline) {
      dim.height = Math.max(maxAscent + maxDescent, dim.height);
    }
    const insets = parentView.insets;
    dim.width += insets.left + insets.right + this.hgap * 2;
    dim.height += insets.top + insets.bottom + this.vgap * 2;
    return dim;
  }

  /**
   * Lays out the view and all its children.
   */
  layoutChildViews(parentView: View): void {
    const insets = parentView.insets;
    const maxwidth = parentView.width - (insets.left + insets.right + this.hgap * 2);
    const nmembers = parentView.childViewCount;
    let x = 0,
      y = insets.top + this.vgap;
    let rowh = 0,
      start = 0;

    const useBaseline = this.alignOnBaseline;
    const ascent: number[] = [];
    const descent: number[] = [];

    for (let i = 0; i < nmembers; i++) {
      const child = parentView.childAtIndex(i);
      if (child.isVisible) {
        const d = child.prefSize;
        child.setSize(d.width, d.height);

        if (useBaseline) {
          const baseline = child.getBaseline(d.width, d.height);
          if (baseline >= 0) {
            ascent.push(baseline);
            descent.push(d.height - baseline);
          } else {
            ascent.push(-1);
            descent.push(0);
          }
        }
        if (x == 0 || x + d.width <= maxwidth) {
          if (x > 0) {
            x += this.hgap;
          }
          x += d.width;
          rowh = Math.max(rowh, d.height);
        } else {
          rowh = this.moveComponents(
            parentView,
            insets.left + this.hgap,
            y,
            maxwidth - x,
            rowh,
            start,
            i,
            this.leftToRight,
            useBaseline,
            ascent,
            descent,
          );
          x = d.width;
          y += this.vgap + rowh;
          rowh = d.height;
          start = i;
        }
      }
    }
    this.moveComponents(
      parentView,
      insets.left + this.hgap,
      y,
      maxwidth - x,
      rowh,
      start,
      nmembers,
      this.leftToRight,
      useBaseline,
      ascent,
      descent,
    );
  }

  /**
   * Centers the elements in the specified row, if there is any slack.
   * @param target the component which needs to be moved
   * @param x the x coordinate
   * @param y the y coordinate
   * @param width the width dimensions
   * @param height the height dimensions
   * @param rowStart the beginning of the row
   * @param rowEnd the the ending of the row
   * @param useBaseline Whether or not to align on baseline.
   * @param ascent Ascent for the components. This is only valid if
   *               useBaseline is true.
   * @param descent Ascent for the components. This is only valid if
   *               useBaseline is true.
   * @return actual row height
   */
  moveComponents(
    target: View,
    x: number,
    y: number,
    width: number,
    height: number,
    rowStart: number,
    rowEnd: number,
    ltr: boolean,
    useBaseline: boolean,
    ascent: number[],
    descent: number[],
  ): number {
    switch (this.alignment) {
      case FlowAlignType.LEFT:
        x += ltr ? 0 : width;
        break;
      case FlowAlignType.CENTER:
        x += width / 2;
        break;
      case FlowAlignType.RIGHT:
        x += ltr ? width : 0;
        break;
      case FlowAlignType.LEADING:
        break;
      case FlowAlignType.TRAILING:
        x += width;
        break;
    }
    let maxAscent = 0;
    let nonbaselineHeight = 0;
    let baselineOffset = 0;
    if (useBaseline) {
      let maxDescent = 0;
      for (let i = rowStart; i < rowEnd; i++) {
        const child = target.childAtIndex(i);
        if (child.isVisible) {
          if (ascent[i] >= 0) {
            maxAscent = Math.max(maxAscent, ascent[i]);
            maxDescent = Math.max(maxDescent, descent[i]);
          } else {
            nonbaselineHeight = Math.max(child.height, nonbaselineHeight);
          }
        }
      }
      height = Math.max(maxAscent + maxDescent, nonbaselineHeight);
      baselineOffset = (height - maxAscent - maxDescent) / 2;
    }
    for (let i = rowStart; i < rowEnd; i++) {
      const child = target.childAtIndex(i);
      if (child.isVisible) {
        let cy;
        if (useBaseline && ascent[i] >= 0) {
          cy = y + baselineOffset + maxAscent - ascent[i];
        } else {
          cy = y + (height - child.height) / 2;
        }
        if (ltr) {
          child.setLocation(x, cy);
        } else {
          child.setLocation(target.width - x - child.width, cy);
        }
        x += child.width + this.hgap;
      }
    }
    return height;
  }
}
