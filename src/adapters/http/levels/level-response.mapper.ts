import type { GameId } from '../../../domain/game/game-id.js';
import type { ILevelSection } from '../../../domain/level/level-section.js';
import type { Level } from '../../../domain/level/level.js';
import type { SectionKey } from '../../../domain/level/section-key.js';

export interface LevelSectionEncoderRegistration {
  readonly gameId: GameId;
  readonly sectionKey: SectionKey;
  readonly encode: (section: ILevelSection) => object;
}

export interface LevelResponse {
  readonly schemaVersion: number;
  readonly id: string;
  readonly gameId: string;
  readonly order: number;
  readonly name: Readonly<{ es: string; en: string }>;
  readonly board: Readonly<{
    topology: string;
    cells: readonly (readonly number[])[];
  }>;
  readonly [sectionKey: string]: unknown;
}

export class LevelResponseMapper {
  private readonly encoders: readonly LevelSectionEncoderRegistration[];

  constructor(encoders: readonly LevelSectionEncoderRegistration[]) {
    this.encoders = [...encoders];
  }

  toResponse(level: Level): LevelResponse {
    const key = level.section.sectionKey();
    const entry = this.encoders.find((candidate) =>
      candidate.gameId.equals(level.gameId),
    );
    if (!entry || !entry.sectionKey.equals(key)) {
      throw new Error('No response encoder for the level section');
    }
    return {
      schemaVersion: level.schemaVersion.toNumber(),
      id: level.id.toString(),
      gameId: level.gameId.toString(),
      order: level.order.toNumber(),
      name: level.name.toRecord(),
      board: {
        topology: level.board.topology.toString(),
        cells: level.board.cells.map((cell) => cell.toArray()),
      },
      [key.toString()]: entry.encode(level.section),
    };
  }
}
