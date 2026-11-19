import { Count } from '../../shared/count.js';
import { RawCoord } from '../raw-coord.js';
import { TopologyId } from '../topology-id.js';
import type { IBoardTopology } from './board-topology.js';

export class HexAxialTopology implements IBoardTopology {
  private readonly offsets = Object.freeze([
    RawCoord.of([1, 0]),
    RawCoord.of([1, -1]),
    RawCoord.of([0, -1]),
    RawCoord.of([-1, 0]),
    RawCoord.of([-1, 1]),
    RawCoord.of([0, 1]),
  ]);

  id(): TopologyId {
    return TopologyId.of('hex-axial');
  }

  coordinateSize(): Count {
    return Count.of(2);
  }

  neighbors(coord: RawCoord): readonly RawCoord[] {
    return this.offsets.map((offset) => coord.translated(offset));
  }
}
