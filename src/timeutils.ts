import { Nullable } from "./types";

export const ONE_MUS = 1000;
export const ONE_MS = 1000000;
export const ONE_SEC = 1000000000;
export const ONE_MIN = 60000000000;
export const ONE_HOUR = 3600000000000;

export interface Diagnostics {
  notifyTimeTaken(time: number, label: string, source: any): void;
}

export function Hours(val: number): number {
  return ONE_HOUR * val;
}

export function Minutes(val: number): number {
  return ONE_MIN * val;
}

export function Seconds(val: number): number {
  return ONE_SEC * val;
}

export function Micros(val: number): number {
  return ONE_MUS * val;
}

export function Millis(val: number): number {
  return ONE_MS * val;
}

export function StrToDuration(value: string): number {
  value = value.toLowerCase();
  const intValue = parseInt(value);
  if (value.endsWith("ms")) {
    return Millis(intValue);
  } else if (value.endsWith("mus")) {
    return Micros(intValue);
  } else if (value.endsWith("s")) {
    return Seconds(intValue);
  }
  return intValue;
}
