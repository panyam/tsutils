export function mixinUuid() {
  return function <T extends { new (...args: any[]): {} }>(constructor: T) {
    // return function (constructor: Function) {
    let counter = 0;
    return class extends constructor {
      // Globally unique ID for all elements.
      readonly uuid = counter++;
    };
  };
}
