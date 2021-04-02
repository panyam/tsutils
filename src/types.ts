export type Timestamp = number;
export type NumberRange = [number, number];

export type StringMap<T> = { [key: string]: T };
export type NumMap<T> = { [key: number]: T };
export type Nullable<T> = T | null;

export type Undefined<T> = T | undefined | void;

export function assert(condition: boolean, msg?: string): asserts condition {
  if (!condition) {
    throw new Error(msg);
  }
}
