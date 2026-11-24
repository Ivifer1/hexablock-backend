import {
  FitPiece,
  FitStarThreshold,
  HexaFitSection,
  PieceId,
} from '../../domain/level/fit/hexa-fit-section.js';
import type { ILevelSection } from '../../domain/level/level-section.js';
import { RawCoord } from '../../domain/level/raw-coord.js';
import {
  ColorId,
  HexaSortSection,
  Seed,
} from '../../domain/level/sort/hexa-sort-section.js';
import { Count } from '../../domain/shared/count.js';
import { Optional } from '../../domain/shared/optional.js';
import {
  readCoordinates,
  readList,
  readNumber,
  readRecord,
  readText,
} from './level-value-readers.js';

export function encodeFitSection(section: ILevelSection): object {
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

export function encodeSortSection(section: ILevelSection): object {
  if (!(section instanceof HexaSortSection)) {
    throw new Error('Expected a Hexa Sort section');
  }
  return {
    goal: { clearedStacks: section.clearedStacks.toNumber() },
    colors: section.colors.map((color) => color.toString()),
    stackHeight: {
      min: section.minHeight.toNumber(),
      max: section.maxHeight.toNumber(),
    },
    ...(section.seed.isPresent()
      ? { seed: section.seed.get().toNumber() }
      : {}),
  };
}

export function decodeFitSection(payload: unknown): HexaFitSection {
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

export function decodeSortSection(payload: unknown): HexaSortSection {
  const sort = readRecord(payload, 'Sort section');
  const goal = readRecord(sort.goal, 'goal');
  const height = readRecord(sort.stackHeight, 'stack height');
  return HexaSortSection.of(
    Count.of(readNumber(goal.clearedStacks, 'cleared stack goal')),
    readList(sort.colors, 'colors', (color) =>
      ColorId.of(readText(color, 'color id')),
    ),
    Count.of(readNumber(height.min, 'minimum stack height')),
    Count.of(readNumber(height.max, 'maximum stack height')),
    Object.hasOwn(sort, 'seed')
      ? Optional.of(Seed.of(readNumber(sort.seed, 'seed')))
      : Optional.empty(),
  );
}
