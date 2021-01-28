export const INFINITY = 1e48;
export type StringMap<T> = { [key: string]: T };
export type NumMap<T> = { [key: number]: T };
export type Int = number;
export type Nullable<T> = T | null;
export type Timestamp = number;
export type Name = string;
export type NumberRange = [number, number];
export const MAX_INT = 2 ** 32;
export const MAX_LONG = 2 ** 64;

export type int = number;
export type float = number;
export type long = number;

export type Undefined<T> = T | undefined | void;

export type Callback = (eventName: string, data: any) => void;
