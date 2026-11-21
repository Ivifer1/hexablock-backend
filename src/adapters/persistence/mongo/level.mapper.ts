import { GameId } from '../../../domain/game/game-id.js';
import { BoardDefinition } from '../../../domain/level/board-definition.js';
import { Level } from '../../../domain/level/level.js';
import { LevelId } from '../../../domain/level/level-id.js';
import { LevelNumber } from '../../../domain/level/level-number.js';
import type { LevelValidator } from '../../../domain/level/level-validator.js';
import { LocalizedName } from '../../../domain/level/localized-name.js';
import { RawCoord } from '../../../domain/level/raw-coord.js';
import { SchemaVersion } from '../../../domain/level/schema-version.js';
import { SectionKey } from '../../../domain/level/section-key.js';
import { TopologyId } from '../../../domain/level/topology-id.js';
import type {
  ILevelSectionMapper,
  LevelSectionMapperRegistration,
} from './level-section-mapper.js';
import {
  readCoordinates,
  readNumber,
  readRecord,
  readText,
} from './stored-level-values.js';
import type { LevelDocument } from './level.schema.js';

export class LevelMapper {
  private readonly sections: readonly LevelSectionMapperRegistration[];

  constructor(
    private readonly validator: LevelValidator,
    sections: readonly LevelSectionMapperRegistration[],
  ) {
    this.sections = [...sections];
  }

  toDocument(level: Level): LevelDocument {
    this.validator.validate(level);
    const mapper = this.mapperFor(level.gameId, level.section.sectionKey());
    return {
      _id: level.id.toString(),
      schemaVersion: level.schemaVersion.toNumber(),
      gameId: level.gameId.toString(),
      order: level.order.toNumber(),
      name: level.name.toRecord(),
      board: {
        topology: level.board.topology.toString(),
        cells: level.board.cells.map((cell) => cell.toArray()),
      },
      section: {
        key: mapper.sectionKey.toString(),
        payload: mapper.toPayload(level.section),
      },
    };
  }

  toDomain(document: LevelDocument): Level {
    try {
      const stored = readRecord(document, 'level');
      const name = readRecord(stored.name, 'level name');
      const board = readRecord(stored.board, 'board');
      const section = readRecord(stored.section, 'section');
      const gameId = GameId.of(readText(stored.gameId, 'game id'));
      const key = SectionKey.of(readText(section.key, 'section key'));
      const mapper = this.mapperFor(gameId, key);
      const level = Level.create({
        id: LevelId.of(readText(stored._id, 'level id')),
        schemaVersion: SchemaVersion.of(
          readNumber(stored.schemaVersion, 'schema version'),
        ),
        gameId,
        order: LevelNumber.of(readNumber(stored.order, 'level order')),
        name: LocalizedName.of(
          readText(name.es, 'Spanish name'),
          readText(name.en, 'English name'),
        ),
        board: BoardDefinition.of(
          TopologyId.of(readText(board.topology, 'topology')),
          readCoordinates(board.cells).map((cell) => RawCoord.of(cell)),
        ),
        section: mapper.toDomain(section.payload),
      });
      this.validator.validate(level);
      return level;
    } catch (cause) {
      // Invalid stored data is a persistence failure, not a normal lookup miss.
      throw new Error('Invalid stored level', { cause });
    }
  }

  private mapperFor(gameId: GameId, key: SectionKey): ILevelSectionMapper {
    const entry = this.sections.find((candidate) =>
      candidate.gameId.equals(gameId),
    );
    if (!entry || !entry.mapper.sectionKey.equals(key)) {
      throw new Error('No level section mapper for the game and section key');
    }
    return entry.mapper;
  }
}
