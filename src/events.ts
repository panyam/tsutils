import { Int, Nullable, Timestamp, Undefined } from "./types";

export type EventName = string;
export type EventCallback = (event: Event) => Undefined<boolean>;

/**
 * Super class of all Events.
 */
export class Event<T = any> {
  readonly name: EventName;
  readonly source: any;
  readonly timeStamp: Timestamp = performance.now();
  data?: T;
  private _suppressed = false;

  constructor(name: EventName, source: any, data?: T) {
    this.name = name;
    this.source = source;
    this.data = data;
  }

  /**
   * Suppresses this event.
   */
  suppress(): void {
    this._suppressed = true;
  }

  /**
   * Returns if the event was suppressed or not.
   * @returns {Bool}
   */
  get wasSuppressed(): boolean {
    return this._suppressed;
  }
}

export class State {
  private static counter = 0;
  stateData: any = null;
  readonly id = State.counter++;

  get name(): string {
    return this.constructor.name;
  }

  enter(data: any): void {
    this.stateData = data;
  }

  handle(event: Event): void {
    // todo
  }
}

export class EventHub {
  private _onCallbacks: { [key: string]: Array<EventCallback> } = {};
  private _muted = false;

  get isMuted(): boolean {
    return this._muted;
  }

  mute(): void {
    this._muted = true;
  }

  unmute(): void {
    this._muted = false;
  }

  on(names: Array<EventName> | string, callback: EventCallback): this {
    return this._addHandler(names, this._onCallbacks, callback);
  }

  removeOn(names: Array<EventName> | string, callback: EventCallback): this {
    return this._removeHandler(names, this._onCallbacks, callback);
  }

  _ensureEventNames(names: Array<EventName> | string): string[] {
    if (typeof names === "string") {
      names = (names as string).split(",");
    }
    return names.map(function (v) {
      return v.trim();
    });
  }

  _addHandler<T>(names: Array<EventName> | string, handlerlist: { [key: string]: Array<T> }, handler: T): this {
    this._ensureEventNames(names).forEach(function (name) {
      handlerlist[name] = handlerlist[name] || [];
      handlerlist[name].push(handler);
    });
    return this;
  }

  _removeHandler<T>(names: Array<EventName> | string, handlerlist: { [key: string]: Array<T> }, handler: T): this {
    this._ensureEventNames(names).forEach(function (name) {
      const evHandlers = handlerlist[name] || [];
      for (let i = 0; i < evHandlers.length; i++) {
        if (evHandlers[i] == handler) {
          evHandlers.splice(i, 1);
          break;
        }
      }
    });
    return this;
  }

  dispatch(event: Event): boolean {
    if (this._dispatch(event, this._onCallbacks) == false) {
      return false;
    }
    return true;
  }

  _dispatch(event: Event, callbacks: { [key: string]: Array<EventCallback> }): boolean {
    const evtCallbacks = callbacks[event.name] || [];
    for (const callback of evtCallbacks) {
      if (callback(event) == false) {
        return false;
      }
    }
    return true;
  }
}

/**
 * StateMachines allow declarative and stateful chaining of events.
 */
export class StateMachine {
  private _states: { [key: string]: State } = {};
  private _rootState: Nullable<State> = null;
  private _currentState: Nullable<State> = null;
  constructor() {
    this._states = {};
    this._rootState = null;
    this._currentState = null;
  }

  /**
   * The starting/root state of the machine.
   *
   * @param {String} name  Name of the default/root state.
   */
  set rootState(name: string) {
    this._rootState = this.getState(name);
    if (this._currentState == null) {
      this._currentState = this._rootState;
    }
  }

  /**
   * Exits the current state (if any) and enters a new state.
   *
   * @param {String}   state   Name of the new state to enter.
   * @param {Object}   data    State specific data for the state handler to use for the new state.
   */
  enter(state: string, data: any = null): void {
    if (state == "") {
      this._currentState = this._rootState;
    } else {
      this._currentState = this.getState(state);
    }
    if (this._currentState != null) {
      this._currentState.enter(data);
    }
  }

  /**
   * Get the state by name.
   *
   * @param {String} name  Name of the state being queried.
   * @returns {State} State object associated with the name.
   */
  getState(name: string): State {
    if (!(name in this._states)) {
      throw Error("State '" + name + "' not yet registered.");
    }
    return this._states[name];
  }

  /**
   * Register a new state in the state machine.
   *
   * @param {State} state  State being registered.  If another State with the same name exists, then a {DuplicateError} is thrown.
   * @param {Bool} isRoot  Whether the new state is a root state.
   */
  registerState(state: State, isRoot = false): void {
    const name = state.name;
    if (name in this._states) {
      throw Error("State '" + name + "' already registered.");
    }
    this._states[name] = state;
    if (isRoot || false) {
      this.rootState = state.name;
    }
  }

  /**
   * Handles an event from the current state in the state machine possibly resulting in a state transition.
   *
   * @param {Object} name    Type of event being sent.
   * @param {EventSource} source  The source generating the event.
   * @param {Object} data    The event specific data.
   */
  handle(event: Event): void {
    if (this._currentState == null) return;

    const nextState: any = this._currentState.handle(event);
    if (nextState != null) {
      if (nextState == "") {
        if (this._rootState != null) {
          this.enter(this._rootState.name);
        } else {
          throw new Error("Root state has not been set");
        }
      } else {
        this.enter(nextState);
      }
    }
  }
}
