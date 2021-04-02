export const INFINITY = 1e48;
export const MAX_INT = 2 ** 32;
export const MAX_LONG = 2 ** 64;

export type Timestamp = number;
export type NumberRange = [number, number];

export type StringMap<T> = { [key: string]: T };
export type NumMap<T> = { [key: number]: T };
export type Nullable<T> = T | null;

export type Undefined<T> = T | undefined | void;
