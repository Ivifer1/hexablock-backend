import type { Count } from '../../shared/count.js';
import type { RawCoord } from '../raw-coord.js';
import type { TopologyId } from '../topology-id.js';

export interface IBoardTopology {
  id(): TopologyId;
  coordinateSize(): Count;
  neighbors(coord: RawCoord): readonly RawCoord[];
}
