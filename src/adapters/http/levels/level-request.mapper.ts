import { GameId } from '../../../domain/game/game-id.js';
import { BoardDefinition } from '../../../domain/level/board-definition.js';
import { LevelId } from '../../../domain/level/level-id.js';
import { LevelNumber } from '../../../domain/level/level-number.js';
import type { ILevelSection } from '../../../domain/level/level-section.js';
import type { LevelValidator } from '../../../domain/level/level-validator.js';
import { Level } from '../../../domain/level/level.js';
import { LocalizedName } from '../../../domain/level/localized-name.js';
import { RawCoord } from '../../../domain/level/raw-coord.js';
import { SchemaVersion } from '../../../domain/level/schema-version.js';
import type { SectionKey } from '../../../domain/level/section-key.js';
import { TopologyId } from '../../../domain/level/topology-id.js';
import { DomainError } from '../../../domain/shared/domain-error.js';
import { ErrorCode } from '../../../domain/shared/error-code.js';
import {
  LevelPayloadError,
  readCoordinates,
  readNumber,
  readRecord,
  readText,
} from '../../levels/level-value-readers.js';
import { RequestValidationError } from '../request-validation.error.js';

export interface LevelSectionDecoderRegistration {
  readonly gameId: GameId;
  readonly sectionKey: SectionKey;
  readonly decode: (payload: unknown) => ILevelSection;
  readonly validationErrors: readonly ErrorCode[];
}

const commonFields = new Set([
  'schemaVersion',
  'id',
  'gameId',
  'order',
  'name',
  'board',
]);
const formatErrors = new Set<ErrorCode>([
  ErrorCode.InvalidGameId,
  ErrorCode.InvalidSchemaVersion,
  ErrorCode.InvalidLevelId,
  ErrorCode.InvalidLevelOrder,
  ErrorCode.InvalidLevelName,
  ErrorCode.InvalidCoordinate,
  ErrorCode.InvalidBoard,
  ErrorCode.UnknownGame,
  ErrorCode.WrongLevelSection,
  ErrorCode.UnknownTopology,
  ErrorCode.BoardNotConnected,
  ErrorCode.InvalidTopologyId,
  ErrorCode.InvalidSectionKey,
  ErrorCode.InvalidCount,
]);

export class LevelRequestMapper {
  private readonly decoders: readonly LevelSectionDecoderRegistration[];

  constructor(
    private readonly validator: LevelValidator,
    decoders: readonly LevelSectionDecoderRegistration[],
  ) {
    this.decoders = [...decoders];
  }

  toLevel(value: unknown): Level {
    let sectionErrors: readonly ErrorCode[] = [];
    try {
      const body = readRecord(value, 'level');
      const gameId = GameId.of(readText(body.gameId, 'gameId'));
      const sectionKey = this.validator.sectionKeyOf(gameId);
      const key = sectionKey.toString();
      const sectionKeys = Object.keys(body).filter(
        (field) => !commonFields.has(field),
      );
      if (sectionKeys.length !== 1 || sectionKeys[0] !== key) {
        throw new LevelPayloadError(
          'section',
          'Expected exactly one section for the game',
        );
      }

      const decoder = this.decoders.find((entry) =>
        entry.gameId.equals(gameId),
      );
      if (!decoder || !decoder.sectionKey.equals(sectionKey)) {
        throw new Error('No input decoder for the level section');
      }
      sectionErrors = decoder.validationErrors;
      const name = readRecord(body.name, 'name');
      const board = readRecord(body.board, 'board');
      const level = Level.create({
        schemaVersion: SchemaVersion.of(
          readNumber(body.schemaVersion, 'schemaVersion'),
        ),
        id: LevelId.of(readText(body.id, 'id')),
        gameId,
        order: LevelNumber.of(readNumber(body.order, 'order')),
        name: LocalizedName.of(
          readText(name.es, 'name.es'),
          readText(name.en, 'name.en'),
        ),
        board: BoardDefinition.of(
          TopologyId.of(readText(board.topology, 'board.topology')),
          readCoordinates(board.cells).map((cell) => RawCoord.of(cell)),
        ),
        section: decoder.decode(body[key]),
      });
      this.validator.validate(level);
      return level;
    } catch (error) {
      if (error instanceof LevelPayloadError) {
        throw new RequestValidationError([
          { field: error.field, message: error.message },
        ]);
      }
      if (
        error instanceof DomainError &&
        (formatErrors.has(error.code) || sectionErrors.includes(error.code))
      ) {
        throw new RequestValidationError([
          { field: 'level', message: 'Invalid level definition' },
        ]);
      }
      throw error;
    }
  }
}
