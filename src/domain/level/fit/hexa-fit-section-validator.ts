import { Count } from '../../shared/count.js';
import { DomainError } from '../../shared/domain-error.js';
import { ErrorCode } from '../../shared/error-code.js';
import { cellsConnected } from '../cells-connected.js';
import type { Level } from '../level.js';
import type { ILevelSectionValidator } from '../level-section-validator.js';
import type { SectionKey } from '../section-key.js';
import type { IBoardTopology } from '../topology/board-topology.js';
import {
  HexaFitSection,
  type FitPiece,
  type FitStarThreshold,
} from './hexa-fit-section.js';

export class HexaFitSectionValidator implements ILevelSectionValidator {
  sectionKey(): SectionKey {
    return HexaFitSection.key;
  }

  validate(level: Level, topology: IBoardTopology): void {
    if (!(level.section instanceof HexaFitSection)) {
      throw new DomainError(ErrorCode.WrongLevelSection);
    }

    const { pieces, stars } = level.section;
    if (
      pieces.some((piece, index) =>
        pieces.slice(0, index).some((other) => piece.id.equals(other.id)),
      ) ||
      !pieces.every((piece) => this.validPiece(piece, topology))
    ) {
      throw new DomainError(ErrorCode.InvalidFitSection);
    }

    const area = pieces.reduce(
      (total, piece) => total.plus(Count.of(piece.cells.length)),
      Count.of(0),
    );
    if (
      !area.equals(Count.of(level.board.cells.length)) ||
      !this.validStars(stars)
    ) {
      throw new DomainError(ErrorCode.InvalidFitSection);
    }
  }

  private validPiece(piece: FitPiece, topology: IBoardTopology): boolean {
    const { cells } = piece;
    return (
      cells.some((cell) => cell.isOrigin()) &&
      cells.every(
        (cell, index) =>
          cell.size().equals(topology.coordinateSize()) &&
          !cells.slice(0, index).some((other) => cell.equals(other)),
      ) &&
      cellsConnected(cells, topology)
    );
  }

  private validStars(thresholds: readonly FitStarThreshold[]): boolean {
    const zero = Count.of(0);
    const two = Count.of(2);
    const three = Count.of(3);

    return (
      thresholds.length <= 2 &&
      thresholds.every((threshold, index) => {
        if (
          !(threshold.stars.equals(two) || threshold.stars.equals(three)) ||
          !zero.isLessThan(threshold.maxMoves) ||
          !zero.isLessThan(threshold.maxSeconds)
        )
          return false;

        if (index === 0) return true;
        const best = thresholds[0];
        return (
          best.stars.equals(three) &&
          threshold.stars.equals(two) &&
          !threshold.maxMoves.isLessThan(best.maxMoves) &&
          !threshold.maxSeconds.isLessThan(best.maxSeconds)
        );
      })
    );
  }
}
