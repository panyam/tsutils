import { Timer } from "./Timer";

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

/**
 * A wrapper for html elements that can be scrolled.
 */
class Scrollable {
  private static counter = 0;
  readonly scrollableId: string = "Scrollable_" + Scrollable.counter++;
  readonly element: HTMLElement;
  private vertical = true;
  parentGroup: ScrollGroup | null = null;

  constructor(element: HTMLElement, vertical = true) {
    this.element = element;
    this.vertical = vertical;
    const currId = this.element.getAttribute("scrollableId") || null;
    if (currId != null && currId.trim() != "") {
      throw new Error("Element already attached to a Scrollable.  Detach first");
    }
    this.element.setAttribute("scrollableId", this.scrollableId);
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

  addEventListener(type: string, listener: EventListener): void {
    this.element.addEventListener(type, listener);
  }

  removeEventListener(type: string, listener: EventListener): void {
    this.element.removeEventListener(type, listener);
  }
}

export class ScrollGroup {
  private scrollables: Scrollable[] = [];
  private onScrollEventListener = this.onScrollEvent.bind(this) as EventListener;
  private onMouseEventListener = this.onMouseEvent.bind(this) as EventListener;
  private onTouchEventListener = this.onTouchEvent.bind(this) as EventListener;
  private focussedElement: HTMLElement | null = null;
  private leadScrollable: Scrollable | null = null;
  private lastScrolledAt = -1;
  private lastScrollOffset = 0;
  private scrollTimer: Timer;

  // If there has been no change in scroll offset within this
  // time then we can assume scrolling has completed and this
  // can be used to infer that scrolling has finished.
  private idleThreshold = 300;

  // Apply sync to followers if we have a scroll distance of atleast
  // this much or time between last even has crossed the
  // `eventDeltaThreshold`.
  private offsetDeltaThreshold = 5;
  private eventDeltaThreshold = 50;

  constructor() {
    this.scrollTimer = new Timer(500, this.onTimer.bind(this));
  }

  add(element: HTMLElement, vertical = true): void {
    // skip if already exists
    if ((element as any).scrollGroup == this) {
      throw new Error("Detach element from ScrollGroup first.");
    }
    const index = this.scrollables.findIndex((s) => s.element == element);
    if (index >= 0) return;
    const scrollable = new Scrollable(element, vertical);
    (element as any).scrollGroup = this;
    scrollable.addEventListener("scroll", this.onScrollEventListener);
    scrollable.addEventListener("mousedown", this.onMouseEventListener);
    scrollable.addEventListener("mouseenter", this.onMouseEventListener);
    scrollable.addEventListener("mouseleave", this.onMouseEventListener);
    scrollable.addEventListener("touchstart", this.onTouchEventListener);
    this.scrollables.push(scrollable);
  }

  remove(element: Scrollable): void {
    const index = this.scrollables.findIndex((s) => s == element);
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
    (scrollable.element as any).scrollGroup = this;
    scrollable.element.removeAttribute("scrollableId");
    scrollable.removeEventListener("scroll", this.onScrollEventListener);
    scrollable.removeEventListener("mousedown", this.onMouseEventListener);
    scrollable.removeEventListener("mouseenter", this.onMouseEventListener);
    scrollable.removeEventListener("mouseleave", this.onMouseEventListener);
    scrollable.removeEventListener("touchstart", this.onTouchEventListener);
    this.scrollables.splice(index, 1);
    return scrollable;
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
    const target = event.target as HTMLElement;
    if (this.leadScrollable == null) {
      this.setLeadScrollable(target);
    }
    const scrollable = this.leadScrollable;
    if (scrollable != null) {
      // update followers
      const offsetDelta = Math.abs(scrollable.scrollOffset - this.lastScrollOffset);
      const timeDelta = Math.abs(event.timeStamp - this.lastScrolledAt);
      if (offsetDelta > this.offsetDeltaThreshold || timeDelta > this.eventDeltaThreshold) {
        this.lastScrolledAt = event.timeStamp;
        this.syncFollowersToLeader();
      }
    }
  }

  syncFollowersToLeader(): void {
    const scrollable = this.leadScrollable;
    if (scrollable != null) {
      this.lastScrollOffset = scrollable.scrollOffset;
      // console.log("Scrolled: ", scrollable.scrollOffset, event);

      // set the scroll position of all others
      // TODO - should this happen in this handler itself?
      const remScroll = Math.max(1, scrollable.scrollSize - scrollable.pageSize);
      for (let i = this.scrollables.length - 1; i >= 0; i--) {
        const other = this.scrollables[i];
        const remOther = Math.max(1, other.scrollSize - other.pageSize);
        /*
        console.log("Scrollable: ", i, other);
        console.log(
          "scrollOffset, scrollSize, pageSize: ",
          other.scrollOffset,
          other.scrollSize,
          other.pageSize,
          remOther,
        );
        */
        if (other != scrollable) {
          other.scrollOffset = (scrollable.scrollOffset * remOther) / remScroll;
        }
      }
    }
  }

  onTouchEvent(event: TouchEvent): void {
    // console.log(`Touched Eeent(${event.type}): `, event);
    if (event.type == "touchstart") {
      this.focussedElement = event.target as HTMLElement;
      // this.setLeadScrollable(this.focussedElement);
    }
  }

  onMouseEvent(event: MouseEvent): void {
    // console.log(`Mouse Event(${event.type}): `, event);
    const element = event.target;
    if (event.type == "mouseenter") {
      this.focussedElement = element as HTMLElement;
    } else if (event.type == "mouseleave") {
      this.focussedElement = null;
    } else if (event.type == "mousedown") {
      this.focussedElement = event.target as HTMLElement;
      // this.setLeadScrollable(this.focussedElement);
    }
  }

  /**
   * Sets the active scrollable to the focussed element.
   */
  protected setLeadScrollable(element: HTMLElement): Scrollable | null {
    if (this.leadScrollable == null) {
      // scrolling has not begun yet so set it as the "root" scroller
      const scrollable = this.scrollables.find((s) => s.element == element);
      if (scrollable != null) {
        this.leadScrollable = scrollable;
        console.log("Scrolling started with: ", scrollable);
        this.scrollTimer.start();
      }
    } else {
      // What if there was an already active scrollable?
      // This can happen if:
      throw new Error("This should now happen");
    }
    return this.leadScrollable;
  }

  onTimer(ts: number): void {
    // Called with our timer
    if (this.leadScrollable != null && ts - this.lastScrolledAt > this.idleThreshold) {
      const offsetDelta = Math.abs(this.leadScrollable.scrollOffset - this.lastScrollOffset);
      if (offsetDelta == 0) {
        // No change in delta within a time window
        this.scrollingFinished(ts);
      }
    }
  }

  protected scrollingFinished(ts: number): void {
    console.log("Scrolling Finished at: ", ts);
    // TODO - See if this can have a jerking effect
    this.syncFollowersToLeader();
    this.leadScrollable = null;
    this.scrollTimer.stop();
  }
}
