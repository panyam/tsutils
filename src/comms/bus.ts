import { EventEmitter } from "events";
export type Callback = (eventName: string, data: any) => void;

export class EventBus extends EventEmitter {
  private static instance: EventBus;

  private constructor() {
    super();
    // do nothing.
  }

  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }

    return EventBus.instance;
  }

  /**
   * Subscribe to an event
   * @param eventName
   * @param callback
   */
  public subscribe(eventName: string, callback: Callback): void {
    this.on(eventName, callback);
  }

  /**
   * Unsubscribe from an event
   * @param eventName
   * @param callback
   */
  public unsubscribe(eventName: string, callback: Callback): void {
    this.removeListener(eventName, callback);
  }

  /**
   *
   * @param eventName Publish an event
   * @param data
   */
  public publish(eventName: string, data: any): void {
    this.emit(eventName, data);
  }
}
