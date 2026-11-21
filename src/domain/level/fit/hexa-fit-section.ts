import type { Count } from '../../shared/count.js';
import { ErrorCode } from '../../shared/error-code.js';
import { copySectionItems } from '../copy-section-items.js';
import type { ILevelSection } from '../level-section.js';
import type { RawCoord } from '../raw-coord.js';
import { SectionKey } from '../section-key.js';

export class PieceId {
  private constructor(private readonly value: string) {}

  static of(value: string): PieceId {
    return new PieceId(value);
  }

  equals(other: PieceId): boolean {
    return this.value === other.value;
  }
}

export class FitPiece {
  private constructor(
    readonly id: PieceId,
    readonly cells: readonly RawCoord[],
  ) {}

  static of(id: PieceId, cells: readonly RawCoord[]): FitPiece {
    return new FitPiece(
      id,
      copySectionItems(cells, ErrorCode.InvalidFitSection),
    );
  }
}

export class FitStarThreshold {
  private constructor(
    readonly stars: Count,
    readonly maxMoves: Count,
    readonly maxSeconds: Count,
  ) {}

  static of(
    stars: Count,
    maxMoves: Count,
    maxSeconds: Count,
  ): FitStarThreshold {
    return new FitStarThreshold(stars, maxMoves, maxSeconds);
  }
}

export class HexaFitSection implements ILevelSection {
  static readonly key = SectionKey.of('fit');

  private constructor(
    readonly pieces: readonly FitPiece[],
    readonly stars: readonly FitStarThreshold[],
  ) {}

  static of(
    pieces: readonly FitPiece[],
    stars: readonly FitStarThreshold[],
  ): HexaFitSection {
    return new HexaFitSection(
      copySectionItems(pieces, ErrorCode.InvalidFitSection),
      copySectionItems(stars, ErrorCode.InvalidFitSection),
    );
  }

  sectionKey(): SectionKey {
    return HexaFitSection.key;
  }
}
