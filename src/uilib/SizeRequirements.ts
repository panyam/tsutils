import { MAX_INT, int, long, float } from "../types";

export default class SizeRequirements {
  /**
   * The minimum size required.
   * For a component <code>comp</code>, this should be equal to either
   * <code>comp.getMinimumSize().width</code> or
   * <code>comp.getMinimumSize().height</code>.
   */
  minimum: number;

  /**
   * The preferred (natural) size.
   * For a component <code>comp</code>, this should be equal to either
   * <code>comp.getPreferredSize().width</code> or
   * <code>comp.getPreferredSize().height</code>.
   */
  preferred: number;

  /**
   * The maximum size allowed.
   * For a component <code>comp</code>, this should be equal to either
   * <code>comp.getMaximumSize().width</code> or
   * <code>comp.getMaximumSize().height</code>.
   */
  maximum: number;

  /**
   * The alignment, specified as a value between 0.0 and 1.0,
   * inclusive.
   * To specify centering, the alignment should be 0.5.
   */
  alignment: number;

  /**
   * Creates a SizeRequirements object with the specified minimum, preferred,
   * and maximum sizes and the specified alignment.
   *
   * @param min the minimum size &gt;= 0
   * @param pref the preferred size &gt;= 0
   * @param max the maximum size &gt;= 0
   * @param a the alignment &gt;= 0.0 &amp;&amp; &lt;= 1.0
   */
  constructor(min = 0, pref = 0, max = 0, a = 0) {
    this.minimum = min;
    this.preferred = pref;
    this.maximum = max;
    this.alignment = a > 1.0 ? 1.0 : a < 0.0 ? 0.0 : a;
  }

  /**
   * Determines the total space necessary to
   * place a set of components end-to-end.  The needs
   * of each component in the set are represented by an entry in the
   * passed-in SizeRequirements array.
   * The returned SizeRequirements object has an alignment of 0.5
   * (centered).  The space requirement is never more than
   * MAX_INT.
   *
   * @param children  the space requirements for a set of components.
   *   The vector may be of zero length, which will result in a
   *   default SizeRequirements object instance being passed back.
   * @return  the total space requirements.
   */
  static getTiledSizeRequirements(children: SizeRequirements[]): SizeRequirements {
    const total = new SizeRequirements();
    for (let i = 0; i < children.length; i++) {
      const req = children[i];
      total.minimum = Math.min(total.minimum + req.minimum, MAX_INT);
      total.preferred = Math.min(total.preferred + req.preferred, MAX_INT);
      total.maximum = Math.min(total.maximum + req.maximum, MAX_INT);
    }
    return total;
  }

  /**
   * Determines the total space necessary to
   * align a set of components.  The needs
   * of each component in the set are represented by an entry in the
   * passed-in SizeRequirements array.  The total space required will
   * never be more than MAX_INT.
   *
   * @param children  the set of child requirements.  If of zero length,
   *  the returns result will be a default instance of SizeRequirements.
   * @return  the total space requirements.
   */
  static getAlignedSizeRequirements(children: SizeRequirements[]): SizeRequirements {
    const totalAscent = new SizeRequirements();
    const totalDescent = new SizeRequirements();
    for (let i = 0; i < children.length; i++) {
      const req = children[i];

      let ascent = req.alignment * req.minimum;
      let descent = req.minimum - ascent;
      totalAscent.minimum = Math.max(ascent, totalAscent.minimum);
      totalDescent.minimum = Math.max(descent, totalDescent.minimum);

      ascent = req.alignment * req.preferred;
      descent = req.preferred - ascent;
      totalAscent.preferred = Math.max(ascent, totalAscent.preferred);
      totalDescent.preferred = Math.max(descent, totalDescent.preferred);

      ascent = req.alignment * req.maximum;
      descent = req.maximum - ascent;
      totalAscent.maximum = Math.max(ascent, totalAscent.maximum);
      totalDescent.maximum = Math.max(descent, totalDescent.maximum);
    }
    const min = Math.min(totalAscent.minimum + totalDescent.minimum, MAX_INT);
    const pref = Math.min(totalAscent.preferred + totalDescent.preferred, MAX_INT);
    const max = Math.min(totalAscent.maximum + totalDescent.maximum, MAX_INT);
    let alignment = 0.0;
    if (min > 0) {
      alignment = totalAscent.minimum / min;
      alignment = alignment > 1.0 ? 1.0 : alignment < 0.0 ? 0.0 : alignment;
    }
    return new SizeRequirements(min, pref, max, alignment);
  }

  /**
   * Creates a set of offset/span pairs representing how to
   * lay out a set of components end-to-end.
   * This method requires that you specify
   * the total amount of space to be allocated,
   * the size requirements for each component to be placed
   * (specified as an array of SizeRequirements), and
   * the total size requirement of the set of components.
   * You can get the total size requirement
   * by invoking the getTiledSizeRequirements method.
   *
   * This method also requires a flag indicating whether components
   * should be tiled in the forward direction (offsets increasing
   * from 0) or reverse direction (offsets decreasing from the end
   * of the allocated space).  The forward direction represents
   * components tiled from left to right or top to bottom.  The
   * reverse direction represents components tiled from right to left
   * or bottom to top.
   *
   * @param allocated the total span to be allocated &gt;= 0.
   * @param total     the total of the children requests.  This argument
   *  is optional and may be null.
   * @param children  the size requirements for each component.
   * @param offsets   the offset from 0 for each child where
   *   the spans were allocated (determines placement of the span).
   * @param spans     the span allocated for each child to make the
   *   total target span.
   * @param forward   tile with offsets increasing from 0 if true
   *   and with offsets decreasing from the end of the allocated space
   *   if false.
   * @since 1.4
   */
  static calculateTiledPositions(
    allocated: int,
    total: SizeRequirements,
    children: SizeRequirements[],
    offsets: number[],
    spans: number[],
    forward = true,
  ): void {
    // The total argument turns out to be a bad idea since the
    // total of all the children can overflow the integer used to
    // hold the total.  The total must therefore be calculated and
    // stored in long variables.
    let min = 0;
    let pref = 0;
    let max = 0;
    for (let i = 0; i < children.length; i++) {
      min += children[i].minimum;
      pref += children[i].preferred;
      max += children[i].maximum;
    }
    if (allocated >= pref) {
      SizeRequirements.expandedTile(allocated, min, pref, max, children, offsets, spans, forward);
    } else {
      SizeRequirements.compressedTile(allocated, min, pref, max, children, offsets, spans, forward);
    }
  }

  static compressedTile(
    allocated: number,
    min: number,
    pref: number,
    max: number,
    request: SizeRequirements[],
    offsets: number[],
    spans: number[],
    forward = true,
  ): void {
    // ---- determine what we have to work with ----
    const totalPlay = Math.min(pref - allocated, pref - min);
    const factor = pref - min == 0 ? 0.0 : totalPlay / (pref - min);

    // ---- make the adjustments ----
    let totalOffset: number;
    if (forward) {
      // lay out with offsets increasing from 0
      totalOffset = 0;
      for (let i = 0; i < spans.length; i++) {
        offsets[i] = totalOffset;
        const req = request[i];
        const play = factor * (req.preferred - req.minimum);
        spans[i] = req.preferred - play;
        totalOffset = Math.min(totalOffset + spans[i], MAX_INT);
      }
    } else {
      // lay out with offsets decreasing from the end of the allocation
      totalOffset = allocated;
      for (let i = 0; i < spans.length; i++) {
        const req = request[i];
        const play = factor * (req.preferred - req.minimum);
        spans[i] = req.preferred - play;
        offsets[i] = totalOffset - spans[i];
        totalOffset = Math.max(totalOffset - spans[i], 0);
      }
    }
  }

  static expandedTile(
    allocated: int,
    min: long,
    pref: long,
    max: long,
    request: SizeRequirements[],
    offsets: number[],
    spans: number[],
    forward = true,
  ): void {
    // ---- determine what we have to work with ----
    const totalPlay = Math.min(allocated - pref, max - pref);
    const factor = max - pref == 0 ? 0.0 : totalPlay / (max - pref);

    // ---- make the adjustments ----
    let totalOffset: number;
    if (forward) {
      // lay out with offsets increasing from 0
      totalOffset = 0;
      for (let i = 0; i < spans.length; i++) {
        offsets[i] = totalOffset;
        const req = request[i];
        const play = factor * (req.maximum - req.preferred);
        spans[i] = Math.min(req.preferred + play, MAX_INT);
        totalOffset = Math.min(totalOffset + spans[i], MAX_INT);
      }
    } else {
      // lay out with offsets decreasing from the end of the allocation
      totalOffset = allocated;
      for (let i = 0; i < spans.length; i++) {
        const req = request[i];
        const play = factor * (req.maximum - req.preferred);
        spans[i] = Math.min(req.preferred + play, MAX_INT);
        offsets[i] = totalOffset - spans[i];
        totalOffset = Math.max(totalOffset - spans[i], 0);
      }
    }
  }

  /**
   * Creates a set of offset/span pairs specifying how to
   * lay out a set of components with the specified alignments.
   * The resulting span allocations will overlap, with each one
   * fitting as well as possible into the given total allocation.
   * This method requires that you specify
   * the total amount of space to be allocated,
   * the size requirements for each component to be placed
   * (specified as an array of SizeRequirements), and
   * the total size requirements of the set of components
   * (only the alignment field of which is actually used)
   * You can get the total size requirement by invoking
   * getAlignedSizeRequirements.
   *
   * This method also requires a flag indicating whether normal or
   * reverse alignment should be performed.  With normal alignment
   * the value 0.0 represents the left/top edge of the component
   * to be aligned.  With reverse alignment, 0.0 represents the
   * right/bottom edge.
   *
   * @param allocated the total span to be allocated &gt;= 0.
   * @param total     the total of the children requests.
   * @param children  the size requirements for each component.
   * @param offsets   the offset from 0 for each child where
   *   the spans were allocated (determines placement of the span).
   * @param spans     the span allocated for each child to make the
   *   total target span.
   * @param normal    when true, the alignment value 0.0 means
   *   left/top; when false, it means right/bottom.
   * @since 1.4
   */
  static calculateAlignedPositions(
    allocated: int,
    total: SizeRequirements,
    children: SizeRequirements[],
    offsets: number[],
    spans: number[],
    normal = true,
  ): void {
    const totalAlignment = normal ? total.alignment : 1.0 - total.alignment;
    const totalAscent = allocated * totalAlignment;
    const totalDescent = allocated - totalAscent;
    for (let i = 0; i < children.length; i++) {
      const req = children[i];
      const alignment = normal ? req.alignment : 1.0 - req.alignment;
      const maxAscent = req.maximum * alignment;
      const maxDescent = req.maximum - maxAscent;
      const ascent = Math.min(totalAscent, maxAscent);
      const descent = Math.min(totalDescent, maxDescent);

      offsets[i] = totalAscent - ascent;
      spans[i] = Math.min(ascent + descent, MAX_INT);
    }
  }
}
