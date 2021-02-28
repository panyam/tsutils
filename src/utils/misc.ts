export function assert(condition: boolean, msg?: string): asserts condition {
  if (!condition) {
    throw new Error(msg);
  }
}

export function encodeAs(value: number, alphabet: string): string {
  let out = "";
  const nDig = alphabet.length;
  while (value > 0) {
    const digit = value % nDig;
    out = alphabet[digit] + out;
    value = Math.floor(value / nDig);
  }
  return out;
}

export function ifDefined(value: any, elseVal = null): any {
  return typeof value === "undefined" ? elseVal : value;
}

export function stripQuotes(str: string): string {
  str = str.trim();
  if (str.startsWith('"')) str = str.substring(1);
  if (str.endsWith('"')) str = str.substring(0, str.length - 1);
  return str;
}

export function trimmedSplit(value: string | null, delimiter: string): string[] {
  if (value == null) return [];
  return (value || "")
    .split(delimiter)
    .map((v) => v.trim())
    .filter((v) => v.length > 0);
}

export function ArrayTimesN<T = number>(count: number, value: T): T[] {
  const out: T[] = [];
  for (let i = 0; i < count; i++) {
    out.push(value);
  }
  return out;
}

export function firstIndexOf<T>(
  items: ReadonlyArray<T>,
  cmpFunc: (t: T) => boolean,
  startIndex = 0,
  ensure = false,
): number {
  for (let i = startIndex; i < items.length; i++) {
    if (cmpFunc(items[i])) return i;
  }
  if (ensure) {
    throw new Error("Matching item not found");
  }
  return -1;
}
