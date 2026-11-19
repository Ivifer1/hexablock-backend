import type { GameId } from '../game/game-id.js';
import type { BoardDefinition } from './board-definition.js';
import type { LevelId } from './level-id.js';
import type { LevelNumber } from './level-number.js';
import type { ILevelSection } from './level-section.js';
import type { LocalizedName } from './localized-name.js';
import type { SchemaVersion } from './schema-version.js';

export interface LevelProperties {
  readonly schemaVersion: SchemaVersion;
  readonly id: LevelId;
  readonly gameId: GameId;
  readonly order: LevelNumber;
  readonly name: LocalizedName;
  readonly board: BoardDefinition;
  readonly section: ILevelSection;
}

export class Level {
  private constructor(
    readonly schemaVersion: SchemaVersion,
    readonly id: LevelId,
    readonly gameId: GameId,
    readonly order: LevelNumber,
    readonly name: LocalizedName,
    readonly board: BoardDefinition,
    readonly section: ILevelSection,
  ) {}

  static create(properties: LevelProperties): Level {
    return new Level(
      properties.schemaVersion,
      properties.id,
      properties.gameId,
      properties.order,
      properties.name,
      properties.board,
      properties.section,
    );
  }
}
