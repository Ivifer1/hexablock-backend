import { HexaFitSection } from '../../domain/level/fit/hexa-fit-section.js';
import type { ILevelSection } from '../../domain/level/level-section.js';
import { HexaSortSection } from '../../domain/level/sort/hexa-sort-section.js';

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
