import fitExample from '../../../docs/specs/levels/hexa-fit.example.json' with { type: 'json' };
import { GameId } from '../../../src/domain/game/game-id.js';
import { BoardDefinition } from '../../../src/domain/level/board-definition.js';
import { Level } from '../../../src/domain/level/level.js';
import { LevelId } from '../../../src/domain/level/level-id.js';
import { LevelNumber } from '../../../src/domain/level/level-number.js';
import type { ILevelSection } from '../../../src/domain/level/level-section.js';
import { LocalizedName } from '../../../src/domain/level/localized-name.js';
import { RawCoord } from '../../../src/domain/level/raw-coord.js';
import { SchemaVersion } from '../../../src/domain/level/schema-version.js';
import { TopologyId } from '../../../src/domain/level/topology-id.js';

type LevelFixture = Pick<
  typeof fitExample,
  'schemaVersion' | 'id' | 'gameId' | 'order' | 'name' | 'board'
>;

export function levelFrom(
  fixture: LevelFixture,
  section: ILevelSection,
): Level {
  return Level.create({
    schemaVersion: SchemaVersion.of(fixture.schemaVersion),
    id: LevelId.of(fixture.id),
    gameId: GameId.of(fixture.gameId),
    order: LevelNumber.of(fixture.order),
    name: LocalizedName.of(fixture.name.es, fixture.name.en),
    board: BoardDefinition.of(
      TopologyId.of(fixture.board.topology),
      fixture.board.cells.map((coord) => RawCoord.of(coord)),
    ),
    section,
  });
}

export function sparse<T>(length: number): T[] {
  const values: T[] = [];
  values.length = length;
  return values;
}
