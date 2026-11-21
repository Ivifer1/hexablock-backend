import {
  FitPiece,
  FitStarThreshold,
  HexaFitSection,
  PieceId,
} from '../../../domain/level/fit/hexa-fit-section.js';
import type { ILevelSection } from '../../../domain/level/level-section.js';
import { RawCoord } from '../../../domain/level/raw-coord.js';
import { Count } from '../../../domain/shared/count.js';
import type { ILevelSectionMapper } from './level-section-mapper.js';
import {
  readCoordinates,
  readList,
  readNumber,
  readRecord,
  readText,
} from './stored-level-values.js';

export class HexaFitSectionMapper implements ILevelSectionMapper {
  readonly sectionKey = HexaFitSection.key;

  toPayload(section: ILevelSection): unknown {
    if (!(section instanceof HexaFitSection)) {
      throw new Error('Expected a Hexa Fit section');
    }
    return {
      pieces: section.pieces.map((piece) => ({
        id: piece.id.toString(),
        cells: piece.cells.map((cell) => cell.toArray()),
      })),
      stars: section.stars.map((threshold) => ({
        stars: threshold.stars.toNumber(),
        maxMoves: threshold.maxMoves.toNumber(),
        maxSeconds: threshold.maxSeconds.toNumber(),
      })),
    };
  }

  toDomain(payload: unknown): HexaFitSection {
    const fit = readRecord(payload, 'Fit section');
    return HexaFitSection.of(
      readList(fit.pieces, 'pieces', (raw) => {
        const piece = readRecord(raw, 'piece');
        return FitPiece.of(
          PieceId.of(readText(piece.id, 'piece id')),
          readCoordinates(piece.cells).map((cell) => RawCoord.of(cell)),
        );
      }),
      readList(fit.stars, 'stars', (raw) => {
        const stars = readRecord(raw, 'star threshold');
        return FitStarThreshold.of(
          Count.of(readNumber(stars.stars, 'star award')),
          Count.of(readNumber(stars.maxMoves, 'move limit')),
          Count.of(readNumber(stars.maxSeconds, 'time limit')),
        );
      }),
    );
  }
}
