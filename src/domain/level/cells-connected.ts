import type { RawCoord } from './raw-coord.js';
import type { IBoardTopology } from './topology/board-topology.js';

export function cellsConnected(
  cells: readonly RawCoord[],
  topology: IBoardTopology,
): boolean {
  const reached = cells.slice(0, 1);
  for (const cell of reached) {
    for (const neighbor of topology.neighbors(cell)) {
      if (
        cells.some((candidate) => candidate.equals(neighbor)) &&
        !reached.some((visited) => visited.equals(neighbor))
      ) {
        reached.push(neighbor);
      }
    }
  }
  return reached.length === cells.length;
}
