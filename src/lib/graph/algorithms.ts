/**
 * Pure graph algorithm utilities.
 * These are intentionally kept framework-agnostic so they can be used
 * in both the 2D (D3/SVG) and 3D (react-force-graph-3d/WebGL) renderers.
 */

/**
 * Build an undirected adjacency map from a flat link array.
 * Both source and target can be raw string IDs or resolved node objects.
 */
export function buildAdjacencyMap(
  links: { source: string | { id: string }; target: string | { id: string } }[]
): Map<string, Set<string>> {
  const adjacency = new Map<string, Set<string>>();

  links.forEach(link => {
    const source = typeof link.source === 'string' ? link.source : link.source.id;
    const target = typeof link.target === 'string' ? link.target : link.target.id;

    if (!adjacency.has(source)) adjacency.set(source, new Set());
    if (!adjacency.has(target)) adjacency.set(target, new Set());

    adjacency.get(source)!.add(target);
    adjacency.get(target)!.add(source);
  });

  return adjacency;
}

/**
 * BFS from `nodeId` up to `maxDepth` hops.
 * Returns a map of nodeId → distance (distance 0 = the starting node itself,
 * which is NOT included in the result — callers add it manually when needed).
 */
export function getKHopNeighbors(
  nodeId: string,
  adjacency: Map<string, Set<string>>,
  maxDepth = 2
): Map<string, number> {
  const result = new Map<string, number>();
  const visited = new Set<string>();
  const queue: { nodeId: string; depth: number }[] = [{ nodeId, depth: 0 }];

  while (queue.length > 0) {
    const { nodeId: current, depth } = queue.shift()!;

    if (visited.has(current)) continue;
    visited.add(current);

    if (depth > 0) {
      result.set(current, depth);
    }

    if (depth < maxDepth) {
      const neighbors = adjacency.get(current) ?? new Set<string>();
      neighbors.forEach(neighbor => {
        if (!visited.has(neighbor)) {
          queue.push({ nodeId: neighbor, depth: depth + 1 });
        }
      });
    }
  }

  return result;
}

/**
 * Map a BFS distance to a visual activation intensity in [0, 1].
 *  0 hops  → 1.0  (the hovered/focal node itself)
 *  1 hop   → 0.6
 *  2 hops  → 0.3
 *  >2 hops → 0   (no activation)
 */
export function calculateActivationIntensity(distance: number): number {
  if (distance === 0) return 1;
  if (distance === 1) return 0.6;
  if (distance === 2) return 0.3;
  return 0;
}
