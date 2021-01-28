import { PQ } from "../pq";
import { Comparator, Storage } from "../storage";
import { ListStorage } from "../list";
import { BinHeapStorage } from "../binheap";
const each = require("jest-each").default;

class Value<T> {
  value: T;
  constructor(value: T) {
    this.value = value;
  }
}

const TEST_NUMS = [5, 1, 10, 4, 2, 6, 7];

// Compare numbers
const numCmp = (a: number, b: number) => a - b;
const revNumCmp = (a: number, b: number) => b - a;

function StorageCreators<T>(cmp: Comparator<T>) {
  return each([new ListStorage<T>(cmp), new BinHeapStorage<T>(cmp)]);
  // return each([new BinHeapStorage<T>(cmp)]);
}

function isSorted<T>(values: T[], cmp: Comparator<T>): boolean {
  for (let i = 1; i < values.length; i++) {
    if (cmp(values[i - 1], values[i]) > 0) return false;
  }
  return true;
}

describe("PQ Tests", () => {
  StorageCreators(numCmp).it("Test Basic Values", (storage: Storage<number>) => {
    const sortedValues = [...TEST_NUMS];
    sortedValues.sort(numCmp);
    const pq = new PQ(storage);
    pq.heapify(TEST_NUMS.values());

    const pqvalues = Array.from(pq.storage.sortedHandles).map((handle) => handle.value) as number[];
    expect(isSorted(pqvalues, numCmp)).toBe(true);
    for (let i = 0; i < sortedValues.length; i++) {
      const popped = pq.pop();
      expect(sortedValues[i]).toBe(popped);
    }
  });

  StorageCreators(revNumCmp).it("Test Reverse", (storage: Storage<number>) => {
    const sortedValues = [...TEST_NUMS];
    sortedValues.sort(numCmp);
    const reversed = sortedValues.reverse();
    const pq = new PQ(storage);
    pq.heapify(TEST_NUMS.values());

    const pqvalues = Array.from(pq.storage.sortedHandles).map((handle) => handle.value) as number[];
    expect(isSorted(pqvalues, revNumCmp)).toBe(true);
    for (let i = 0; i < reversed.length; i++) {
      const popped = pq.pop();
      expect(reversed[i]).toBe(popped);
    }
  });

  StorageCreators(numCmp).it("Test Push", (storage: Storage<number>) => {
    const pq = new PQ(storage);
    const handle = pq.push(5);
    expect(pq.size).toBe(1);
    expect(pq.find(5)).toBe(handle);
  });

  StorageCreators((v1: Value<number>, v2: Value<number>) => v1.value - v2.value).it(
    "Test Remove",
    (storage: Storage<Value<number>>) => {
      const pq = new PQ(storage, (v) => v.value);
      const values = TEST_NUMS.map((x) => new Value(x));
      pq.heapify(values.values());
      expect(pq.top!.value.value).toBe(1);
      // Pop and see the min change
      pq.pop();
      expect(pq.find(values[1])).toBe(null);
      expect(pq.top.value.value).toBe(2);

      // Remove and test
      pq.removeValue(values[0]);
      expect(pq.top.value.value).toBe(2);
      expect(pq.find(5 as any)).toBe(null);
      expect(pq.size).toBe(5);
    },
  );

  StorageCreators((v1: Value<number>, v2: Value<number>) => v1.value - v2.value).it(
    "Test Find",
    (storage: Storage<Value<number>>) => {
      const pq = new PQ(storage, (v) => v.value);
      // Add a bunch of values, and find the entries
      const values = TEST_NUMS.map((x) => new Value(x));
      pq.heapify(values.values());

      expect(pq.top.value).toBe(values[1]);
      const ptr = pq.find(values[0]);
      expect(ptr!.value).toBe(values[0]);
    },
  );

  StorageCreators((v1: Value<number>, v2: Value<number>) => v1.value - v2.value).it(
    "Test Adjust",
    (storage: Storage<Value<number>>) => {
      const pq = new PQ(storage, (v) => v.value);

      // Add a bunch of values, and find the entries
      const values = [5, 2, 10].map((x) => new Value(x));
      pq.heapify(values.values());

      expect(pq.top.value).toBe(values[1]);
      const ptr = pq.find(values[0])!;
      ptr.value.value = 1;
      pq.adjust(ptr);
      expect(pq.top.value).toBe(values[0]);
    },
  );
  /*
   */
});
