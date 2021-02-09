import { Nullable } from "../types";
import { Size } from "./core";
import { View } from "./View";
import { DefaultLayoutManager } from "./Layouts";

export enum BorderLayoutConstraint {
  /**
   * The north layout constraint (top of container).
   */
  NORTH = "North",

  /**
   * The south layout constraint (bottom of container).
   */
  SOUTH = "South",

  /**
   * The east layout constraint (right side of container).
   */
  EAST = "East",

  /**
   * The west layout constraint (left side of container).
   */
  WEST = "West",

  /**
   * The center layout constraint (middle of container).
   */
  CENTER = "Center",

  /**
   * Synonym for PAGE_START.  Exists for compatibility with previous
   * versions.  PAGE_START is pref.
   */
  BEFORE_FIRST_LINE = "First",

  /**
   * Synonym for PAGE_END.  Exists for compatibility with previous
   * versions.  PAGE_END is pref.
   */
  AFTER_LAST_LINE = "Last",

  /**
   * Synonym for LINE_START.  Exists for compatibility with previous
   * versions.  LINE_START is pref.
   */
  BEFORE_LINE_BEGINS = "Before",

  /**
   * Synonym for LINE_END.  Exists for compatibility with previous
   * versions.  LINE_END is pref.
   */
  AFTER_LINE_ENDS = "After",

  /**
   * The component comes before the first line of the layout's content.
   * For Western, left-to-right and top-to-bottom orientations, this is
   * equivalent to NORTH.
   */
  PAGE_START = BEFORE_FIRST_LINE,

  /**
   * The component comes after the last line of the layout's content.
   * For Western, left-to-right and top-to-bottom orientations, this is
   * equivalent to SOUTH.
   */
  PAGE_END = AFTER_LAST_LINE,

  /**
   * The component goes at the beginning of the line direction for the
   * layout. For Western, left-to-right and top-to-bottom orientations,
   * this is equivalent to WEST.
   */
  LINE_START = BEFORE_LINE_BEGINS,

  /**
   * The component goes at the end of the line direction for the
   * layout. For Western, left-to-right and top-to-bottom orientations,
   * this is equivalent to EAST.
   */
  LINE_END = AFTER_LINE_ENDS,
}

export class BorderLayout extends DefaultLayoutManager {
  protected northView: Nullable<View> = null;
  protected eastView: Nullable<View> = null;
  protected westView: Nullable<View> = null;
  protected southView: Nullable<View> = null;
  protected centerView: Nullable<View> = null;

  protected firstLine: Nullable<View> = null;
  protected lastLine: Nullable<View> = null;
  protected firstItem: Nullable<View> = null;
  protected lastItem: Nullable<View> = null;

  /**
   * The layout manager allows a seperation of
   * components with gaps.  The horizontal gap will
   * specify the space between components and between
   * the components and the borders of the
   * <code>Container</code>.
   */
  readonly hgap: number;

  /**
   * The layout manager allows a seperation of
   * components with gaps.  The vertical gap will
   * specify the space between rows and between the
   * the rows and the borders of the <code>Container</code>.
   */
  readonly vgap: number;

  /**
   * Whether to layout left to right or right to left.
   */
  readonly leftToRight: boolean;

  /**
   * Creates a new flow layout manager with the indicated alignment
   * and the indicated horizontal and vertical gaps.
   */
  constructor(hgap = 0, vgap = 0, leftToRight = true) {
    super();
    this.hgap = hgap;
    this.vgap = vgap;
    this.leftToRight = leftToRight;
  }

  /**
   * Returns the alignment along the x axis.  This specifies how
   * the component would like to be aligned relative to other
   * components.  The value should be a number between 0 and 1
   * where 0 represents alignment along the origin, 1 is aligned
   * the furthest away from the origin, 0.5 is centered, etc.
   */
  layoutAlignmentX(parentView: View): number {
    return 0.5;
  }

  /**
   * Returns the alignment along the y axis.  This specifies how
   * the component would like to be aligned relative to other
   * components.  The value should be a number between 0 and 1
   * where 0 represents alignment along the origin, 1 is aligned
   * the furthest away from the origin, 0.5 is centered, etc.
   */
  layoutAlignmentY(parentView: View): number {
    return 0.5;
  }

  addView(view: View, name: BorderLayoutConstraint = BorderLayoutConstraint.CENTER): void {
    if (BorderLayoutConstraint.CENTER == name) {
      this.centerView = view;
    } else if (BorderLayoutConstraint.NORTH == name) {
      this.northView = view;
    } else if (BorderLayoutConstraint.SOUTH == name) {
      this.southView = view;
    } else if (BorderLayoutConstraint.EAST == name) {
      this.eastView = view;
    } else if (BorderLayoutConstraint.WEST == name) {
      this.westView = view;
    } else if (BorderLayoutConstraint.BEFORE_FIRST_LINE == name) {
      this.firstLine = view;
    } else if (BorderLayoutConstraint.AFTER_LAST_LINE == name) {
      this.lastLine = view;
    } else if (BorderLayoutConstraint.BEFORE_LINE_BEGINS == name) {
      this.firstItem = view;
    } else if (BorderLayoutConstraint.AFTER_LINE_ENDS == name) {
      this.lastItem = view;
    } else {
      throw new Error("cannot add to layout: unknown constraint: " + name);
    }
  }

  removeView(view: View): void {
    if (view == this.centerView) {
      this.centerView = null;
    } else if (view == this.northView) {
      this.northView = null;
    } else if (view == this.southView) {
      this.southView = null;
    } else if (view == this.eastView) {
      this.eastView = null;
    } else if (view == this.westView) {
      this.westView = null;
    }
    if (view == this.firstLine) {
      this.firstLine = null;
    } else if (view == this.lastLine) {
      this.lastLine = null;
    } else if (view == this.firstItem) {
      this.firstItem = null;
    } else if (view == this.lastItem) {
      this.lastItem = null;
    }
  }

  /**
   * Returns the min size of a view whose is layout is being managed by us.
   */
  minLayoutSize(parentView: View): Size {
    const dim = new Size(0, 0);

    const ltr = this.leftToRight;
    let c: Nullable<View> = null;

    if ((c = this.getChild(BorderLayoutConstraint.EAST, ltr)) != null) {
      const d = c.minSize;
      dim.width += d.width + this.hgap;
      dim.height = Math.max(d.height, dim.height);
    }
    if ((c = this.getChild(BorderLayoutConstraint.WEST, ltr)) != null) {
      const d = c.minSize;
      dim.width += d.width + this.hgap;
      dim.height = Math.max(d.height, dim.height);
    }
    if ((c = this.getChild(BorderLayoutConstraint.CENTER, ltr)) != null) {
      const d = c.minSize;
      dim.width += d.width;
      dim.height = Math.max(d.height, dim.height);
    }
    if ((c = this.getChild(BorderLayoutConstraint.NORTH, ltr)) != null) {
      const d = c.minSize;
      dim.width = Math.max(d.width, dim.width);
      dim.height += d.height + this.vgap;
    }
    if ((c = this.getChild(BorderLayoutConstraint.SOUTH, ltr)) != null) {
      const d = c.minSize;
      dim.width = Math.max(d.width, dim.width);
      dim.height += d.height + this.vgap;
    }

    const insets = parentView.insets;
    dim.width += insets.left + insets.right;
    dim.height += insets.top + insets.bottom;

    return dim;
  }

  /**
   * Returns the pref size of a view whose layout is being managed by us.
   */
  prefLayoutSize(parentView: View): Size {
    const dim = new Size(0, 0);

    const ltr = this.leftToRight;
    let c: Nullable<View> = null;

    if ((c = this.getChild(BorderLayoutConstraint.EAST, ltr)) != null) {
      const d = c.prefSize;
      dim.width += d.width + this.hgap;
      dim.height = Math.max(d.height, dim.height);
    }
    if ((c = this.getChild(BorderLayoutConstraint.WEST, ltr)) != null) {
      const d = c.prefSize;
      dim.width += d.width + this.hgap;
      dim.height = Math.max(d.height, dim.height);
    }
    if ((c = this.getChild(BorderLayoutConstraint.CENTER, ltr)) != null) {
      const d = c.prefSize;
      dim.width += d.width;
      dim.height = Math.max(d.height, dim.height);
    }
    if ((c = this.getChild(BorderLayoutConstraint.NORTH, ltr)) != null) {
      const d = c.prefSize;
      dim.width = Math.max(d.width, dim.width);
      dim.height += d.height + this.vgap;
    }
    if ((c = this.getChild(BorderLayoutConstraint.SOUTH, ltr)) != null) {
      const d = c.prefSize;
      dim.width = Math.max(d.width, dim.width);
      dim.height += d.height + this.vgap;
    }

    const insets = parentView.insets;
    dim.width += insets.left + insets.right;
    dim.height += insets.top + insets.bottom;

    return dim;
  }

  /**
   * Lays out the view and all its children.
   */
  layoutChildViews(parentView: View): void {
    const insets = parentView.insets;
    let top = insets.top;
    let bottom = parentView.height - insets.bottom;
    let left = insets.left;
    let right = parentView.width - insets.right;

    const ltr = this.leftToRight;
    let c: Nullable<View> = null;

    if ((c = this.getChild(BorderLayoutConstraint.NORTH, ltr)) != null) {
      c.setSize(right - left, c.height);
      const d = c.prefSize;
      c.setBounds(left, top, right - left, d.height);
      top += d.height + this.vgap;
    }
    if ((c = this.getChild(BorderLayoutConstraint.SOUTH, ltr)) != null) {
      c.setSize(right - left, c.height);
      const d = c.prefSize;
      c.setBounds(left, bottom - d.height, right - left, d.height);
      bottom -= d.height + this.vgap;
    }
    if ((c = this.getChild(BorderLayoutConstraint.EAST, ltr)) != null) {
      c.setSize(c.width, bottom - top);
      const d = c.prefSize;
      c.setBounds(right - d.width, top, d.width, bottom - top);
      right -= d.width + this.hgap;
    }
    if ((c = this.getChild(BorderLayoutConstraint.WEST, ltr)) != null) {
      c.setSize(c.width, bottom - top);
      const d = c.prefSize;
      c.setBounds(left, top, d.width, bottom - top);
      left += d.width + this.hgap;
    }
    if ((c = this.getChild(BorderLayoutConstraint.CENTER, ltr)) != null) {
      c.setBounds(left, top, right - left, bottom - top);
    }
  }

  /**
   * Get the component that corresponds to the given constraint location
   */
  private getChild(key: string, ltr = true): Nullable<View> {
    let result: Nullable<View> = null;
    if (key == BorderLayoutConstraint.NORTH) {
      result = this.firstLine != null ? this.firstLine : this.northView;
    } else if (key == BorderLayoutConstraint.SOUTH) {
      result = this.lastLine != null ? this.lastLine : this.southView;
    } else if (key == BorderLayoutConstraint.WEST) {
      result = ltr ? this.firstItem : this.lastItem;
      if (result == null) {
        result = this.westView;
      }
    } else if (key == BorderLayoutConstraint.EAST) {
      result = ltr ? this.lastItem : this.firstItem;
      if (result == null) {
        result = this.eastView;
      }
    } else if (key == BorderLayoutConstraint.CENTER) {
      result = this.centerView;
    }
    if (result != null && !result.isVisible) {
      result = null;
    }
    return result;
  }
}
