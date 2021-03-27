type EdgeData = any;
type EdgeFunctor<T> = (node: T) => ReadonlyArray<[T, EdgeData]>;
type IDFunc<T> = (t: T) => number | string;

export function allMinimalCycles<T>(nodes: ReadonlyArray<T>, idFunc: IDFunc<T>, edges: EdgeFunctor<T>): ReadonlyArray<[T, EdgeData]> {
  // Tells which cycle a node is assigned to if any
  const cycles: [T, EdgeData][] = [];
  const inACycle = {} as any;
  nodes.forEach((node) => {
    // start from node and do a BFS to see what cycle a node appears in
    if (!(idFunc(node) in inACycle)) {
      const startNode = node;
      const visited = {} as any;
      let queue: [T, [T, EdgeData][]][] = [[node, []]];
      while (queue.length > 0) {
        const newQueue: [T, [T, EdgeData][]][] = [];
        for (let i = 0; i < queue.length; i++) {
          const [node, cycle] = queue[i];
          for (const [nextNode, edgeData] of edges(node)) {
            if (nextNode == startNode) {
              // we have a cycle
              cycle.push([edgeData, nextNode]);
              cycle.forEach(([n, e], i) => inACycle[n] = true);
              cycles.push([startNode, cycle]);
              cycle.pop();
            } else if (!(idFunc(nextNode) in visited)) {
              visited[nextNode] = true;
              newQueue.push([nextNode, [...cycle, [nextNode, edgeData]]]);
            }
          }
        }
        queue = newQueue;
      }
    }
  });
  return cycles;
}
