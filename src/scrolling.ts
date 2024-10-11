import { Timer } from "./timer";

/**
 * A scroll group allows one to "connect" multiple elements to be
 * scrolled synchronously.
 *
 * A typical usecase would be a div showing lines for a code editor
 * and one that shows a line numbers for a code editor.
 *
 * We could also have recursive relationships where elements in
 * a scroll group are connected to other items outside the scroll
 * group and the would form a super scroll group.  An example would
 * two UI components A and B that
 * a scroll group is synchronized
 */

export class ScrollGroup {
  private scrollables: Scrollable[] = [];
  private isScrolling = false;
  private _focussedScrollable: Scrollable | null = null;

  constructor(public debugLogs = false) {}

  add(scrollable: Scrollable): void {
    // skip if already exists
    const index = this.scrollables.indexOf(scrollable);
    if (index >= 0) return;
    scrollable.attach(this);
    this.scrollables.push(scrollable);
  }

  remove(scrollable: Scrollable): void {
    const index = this.scrollables.indexOf(scrollable);
    if (index < 0) return;
    this.detachAtIndex(index);
  }

  clear(): void {
    for (let i = this.scrollables.length - 1; i >= 0; i--) {
      this.detachAtIndex(i);
    }
  }

  detachAtIndex(index: number): Scrollable {
    const scrollable = this.scrollables[index];
    scrollable.detach();
    this.scrollables.splice(index, 1);
    return scrollable;
  }

  syncFollowers(source: Scrollable): void {
    if (this.isScrolling) return;
    this.isScrolling = true;

    const remScroll = Math.max(1, source.scrollSize - source.pageSize);
    const scrollPct = source.scrollOffset / remScroll;
    for (let i = this.scrollables.length - 1; i >= 0; i--) {
      const other = this.scrollables[i];
      if (other != source) {
        // const remOther = Math.max(1, other.scrollSize - other.pageSize);
        other.scrollOffset = scrollPct * (other.scrollSize - other.pageSize);
      }
    }

    setTimeout(() => {
      this.isScrolling = true;
    }, 50);
  }
}

export interface Scrollable {
  // Set or get the current scroll offset
  scrollOffset: number;

  // Get total scroll size
  readonly scrollSize: number;

  // Size of the current "page".
  // Our scrollOffset + pageSize is always < scrollSize
  readonly pageSize: number;

  // Detaches a scrollable from further use
  attach(scrollGroup: ScrollGroup): void;
  detach(): void;
}

/**
 * A wrapper for html elements that can be scrolled.
 */
export class HTMLElementScrollable implements Scrollable {
  private _scrollGroup: ScrollGroup | null = null;
  readonly element: HTMLElement;
  private vertical = true;
  private onScrollEventListener = this.onScrollEvent.bind(this) as EventListener;
  private onMouseEventListener = this.onMouseEvent.bind(this) as EventListener;
  private onTouchEventListener = this.onTouchEvent.bind(this) as EventListener;

  constructor(element: HTMLElement, vertical = true) {
    this.element = element;
    this.vertical = vertical;
  }

  attach(scrollGroup: ScrollGroup): void {
    if ((this.element as any).scrollGroup == scrollGroup) {
      return;
    } else if ((this.element as any).scrollGroup) {
      throw new Error("Detach element from ScrollGroup first.");
    }
    (this.element as any).scrollGroup = scrollGroup;
    this._scrollGroup = scrollGroup;
    this.element.addEventListener("scroll", this.onScrollEventListener);
    this.element.addEventListener("mousedown", this.onMouseEventListener);
    this.element.addEventListener("mouseenter", this.onMouseEventListener);
    this.element.addEventListener("mouseleave", this.onMouseEventListener);
    this.element.addEventListener("touchstart", this.onTouchEventListener);
  }

  detach(): void {
    (this.element as any).scrollGroup = null;
    this.element.removeEventListener("scroll", this.onScrollEventListener);
    this.element.removeEventListener("mousedown", this.onMouseEventListener);
    this.element.removeEventListener("mouseenter", this.onMouseEventListener);
    this.element.removeEventListener("mouseleave", this.onMouseEventListener);
    this.element.removeEventListener("touchstart", this.onTouchEventListener);
  }

  get scrollGroup(): ScrollGroup | null {
    return this._scrollGroup;
  }

  // Set or get the current scroll offset
  get scrollOffset(): number {
    if (this.vertical) {
      return this.element.scrollTop;
    } else {
      return this.element.scrollLeft;
    }
  }

  set scrollOffset(value: number) {
    if (this.vertical) {
      this.element.scrollTop = value;
    } else {
      this.element.scrollLeft = value;
    }
  }

  // Get total scroll size
  get scrollSize(): number {
    if (this.vertical) {
      return this.element.scrollHeight;
    } else {
      return this.element.scrollWidth;
    }
  }

  // Size of the current "page".
  // Our scrollOffset + pageSize is always < scrollSize
  get pageSize(): number {
    if (this.vertical) {
      return this.element.clientHeight;
    } else {
      return this.element.clientWidth;
    }
  }

  onScrollEvent(event: Event): void {
    /**
     * Scroll events will be sent for all elements that are scrolling
     * either programatically or invoked via gestures.
     * It is not possible to know which of these it is and the problem
     * with this is that by handling all events it could result in an
     * infinite loop kicking each other off.
     *
     * So we need a way to be able differentiate scroll events between
     * those that were the "source" and those that are "followers".
     * We can try a few strategies here:
     *
     * 1. Take the first scroll event's target as the source
     * and kick off a timer to check when scroll events stop.  As long
     * as scroll events come from this source we update followers.
     */
    this.scrollGroup?.syncFollowers(this);
  }

  onTouchEvent(event: TouchEvent): void {
    // console.log(`Touched Eeent(${event.type}): `, event);
    if (event.type == "touchstart" && this.scrollGroup) {
      // this.scrollGroup.focussedScrollable = this;
      // this.setLeadScrollable(this.focussedElement);
    }
  }

  onMouseEvent(event: MouseEvent): void {
    // console.log(`Mouse Event(${event.type}): `, event);
    const element = event.target;
    if (this.scrollGroup) {
      if (event.type == "mouseenter") {
        // this.scrollGroup.focussedScrollable = this;
      } else if (event.type == "mouseleave") {
        // this.scrollGroup.focussedScrollable = null;
      } else if (event.type == "mousedown") {
        // this.scrollGroup.focussedScrollable = this;
        // this.setLeadScrollable(this.focussedElement);
      }
    }
  }
}
