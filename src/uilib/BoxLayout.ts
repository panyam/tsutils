import { MAX_INT } from "../types";
import { ArrayTimesN } from "../utils/misc";
import { Size, View } from "./Views";
import { DefaultLayoutManager } from "./Layouts";
import SizeRequirements from "./SizeRequirements";

export enum BoxLayoutAxis {
  X_AXIS = 0,
  Y_AXIS = 1,
  LINE_AXIS = 2,
  PAGE_AXIS = 3,
}

export class BoxLayout extends DefaultLayoutManager {
  /*
   * Alignment property that determines how each row distributes empty space.
   */
  readonly axis: BoxLayoutAxis;

  readonly leftToRight: boolean;

  readonly isHorizontal: boolean;

  /**
   * Target view which will be laid out by this manager.
   */
  readonly target: View;

  private xChildren: SizeRequirements[] = [];
  private yChildren: SizeRequirements[] = [];
  private xTotal: SizeRequirements;
  private yTotal: SizeRequirements;

  /**
   * Creates a new box layout manager with the indicated alignment
   * and the indicated horizontal and vertical gaps.
   */
  constructor(
    target: View,
    axis = BoxLayoutAxis.X_AXIS,
    leftToRight = true,
    isHorizontal = true
  ) {
    super();
    this.target = target;
    this.axis = axis;
    this.leftToRight = leftToRight;
    this.isHorizontal = isHorizontal;
  }

  invalidateLayout(target: View): void {
    super.invalidateLayout(target);
    this.xChildren = [];
    this.yChildren = [];
  }

  /**
   * Returns the min size of a view whose is layout is being managed by us.
   */
  minLayoutSize(target: View): Size {
    this.validateContainer(target);
    this.validateRequests();
    const size = new Size(this.xTotal.minimum, this.yTotal.minimum);

    const insets = target.insets;
    size.width = Math.min(size.width + insets.left + insets.right, MAX_INT);
    size.height = Math.min(size.height + insets.top + insets.bottom, MAX_INT);
    return size;
  }

  maxLayoutSize(target: View): Size {
    this.validateContainer(target);
    this.validateRequests();
    const size = new Size(this.xTotal.maximum, this.yTotal.maximum);

    const insets = target.insets;
    size.width = Math.min(size.width + insets.left + insets.right, MAX_INT);
    size.height = Math.min(size.height + insets.top + insets.bottom, MAX_INT);
    return size;
  }

  /**
   * Returns the pref size of a view whose layout is being managed by us.
   */
  prefLayoutSize(target: View): Size {
    this.validateContainer(target);
    this.validateRequests();
    const size = new Size(this.xTotal.preferred, this.yTotal.preferred);

    const insets = target.insets;
    size.width = Math.min(size.width + insets.left + insets.right, MAX_INT);
    size.height = Math.min(size.height + insets.top + insets.bottom, MAX_INT);
    return size;
  }

  layoutAlignmentX(target: View): number {
    this.validateContainer(target);
    this.validateRequests();
    return this.xTotal.alignment;
  }

  layoutAlignmentY(target: View): number {
    this.validateContainer(target);
    this.validateRequests();
    return this.yTotal.alignment;
  }

  /**
   * Lays out the view and all its children.
   */
  layoutChildViews(target: View): void {
    this.validateContainer(target);
    const nChildren = target.childViewCount;
    const xOffsets: number[] = ArrayTimesN(nChildren, 0);
    const xSpans: number[] = ArrayTimesN(nChildren, 0);
    const yOffsets: number[] = ArrayTimesN(nChildren, 0);
    const ySpans: number[] = ArrayTimesN(nChildren, 0);

    const alloc = target.size;
    const insets = target.insets;
    alloc.width -= insets.left + insets.right;
    alloc.height -= insets.top + insets.bottom;

    // Resolve axis to an absolute value (either X_AXIS or Y_AXIS)
    const absoluteAxis = this.resolveAxis(this.axis);
    const ltr = absoluteAxis != this.axis ? this.leftToRight : true;

    // determine the child placements
    this.validateRequests();

    if (absoluteAxis == BoxLayoutAxis.X_AXIS) {
      SizeRequirements.calculateTiledPositions(
        alloc.width,
        this.xTotal,
        this.xChildren,
        xOffsets,
        xSpans,
        ltr
      );
      SizeRequirements.calculateAlignedPositions(
        alloc.height,
        this.yTotal,
        this.yChildren,
        yOffsets,
        ySpans
      );
    } else {
      SizeRequirements.calculateAlignedPositions(
        alloc.width,
        this.xTotal,
        this.xChildren,
        xOffsets,
        xSpans,
        ltr
      );
      SizeRequirements.calculateTiledPositions(
        alloc.height,
        this.yTotal,
        this.yChildren,
        yOffsets,
        ySpans
      );
    }

    // flush changes to the container
    for (let i = 0; i < nChildren; i++) {
      const c = target.childAtIndex(i);
      c.setBounds(
        Math.min(insets.left + xOffsets[i], MAX_INT),
        Math.min(insets.top + yOffsets[i], MAX_INT),
        xSpans[i],
        ySpans[i]
      );
    }
  }

  protected validateContainer(target: View): void {
    if (this.target != target) {
      throw new Error("BoxLayout can't be shared");
    }
  }

  protected validateRequests(): void {
    if (this.xChildren.length == 0 || this.yChildren.length == null) {
      // The requests have been invalidated... recalculate
      // the request information.
      const n = this.target.childViewCount;
      this.xChildren = ArrayTimesN(n, null as any);
      this.yChildren = ArrayTimesN(n, null as any);
      for (let i = 0; i < n; i++) {
        const c = this.target.childAtIndex(i);
        if (!c.isVisible) {
          this.xChildren[i] = new SizeRequirements(0, 0, 0, c.alignmentX);
          this.yChildren[i] = new SizeRequirements(0, 0, 0, c.alignmentY);
          continue;
        }
        const min = c.minSize;
        const typ = c.prefSize;
        const max = c.maxSize;
        this.xChildren[i] = new SizeRequirements(
          min.width,
          typ.width,
          max.width,
          c.alignmentX
        );
        this.yChildren[i] = new SizeRequirements(
          min.height,
          typ.height,
          max.height,
          c.alignmentY
        );
      }

      // Resolve axis to an absolute value (either X_AXIS or Y_AXIS)
      const absoluteAxis = this.resolveAxis(this.axis);

      if (absoluteAxis == BoxLayoutAxis.X_AXIS) {
        this.xTotal = SizeRequirements.getTiledSizeRequirements(this.xChildren);
        this.yTotal = SizeRequirements.getAlignedSizeRequirements(
          this.yChildren
        );
      } else {
        this.xTotal = SizeRequirements.getAlignedSizeRequirements(
          this.xChildren
        );
        this.yTotal = SizeRequirements.getTiledSizeRequirements(this.yChildren);
      }
    }
  }

  /**
   * Given one of the 4 axis values, resolve it to an absolute axis.
   * The relative axis values, PAGE_AXIS and LINE_AXIS are converted
   * to their absolute couterpart given the target's ComponentOrientation
   * value.  The absolute axes, X_AXIS and Y_AXIS are returned unmodified.
   */
  private resolveAxis(axis: BoxLayoutAxis): BoxLayoutAxis {
    let absoluteAxis: BoxLayoutAxis;
    if (axis == BoxLayoutAxis.LINE_AXIS) {
      absoluteAxis = this.isHorizontal
        ? BoxLayoutAxis.X_AXIS
        : BoxLayoutAxis.Y_AXIS;
    } else if (axis == BoxLayoutAxis.PAGE_AXIS) {
      absoluteAxis = this.isHorizontal
        ? BoxLayoutAxis.Y_AXIS
        : BoxLayoutAxis.X_AXIS;
    } else {
      absoluteAxis = axis;
    }
    return absoluteAxis;
  }
}
