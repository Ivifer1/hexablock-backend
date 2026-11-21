import type { GameId } from '../game/game-id.js';
import { DomainError } from '../shared/domain-error.js';
import { ErrorCode } from '../shared/error-code.js';
import { cellsConnected } from './cells-connected.js';
import type { Level } from './level.js';
import type { ILevelSectionValidator } from './level-section-validator.js';
import type { SectionKey } from './section-key.js';
import type { TopologyId } from './topology-id.js';
import type { IBoardTopology } from './topology/board-topology.js';

interface SectionRegistration {
  readonly gameId: GameId;
  readonly validator: ILevelSectionValidator;
}

export class LevelValidator {
  private topologies: readonly IBoardTopology[] = [];
  private sections: readonly SectionRegistration[] = [];

  registerTopology(topology: IBoardTopology): void {
    this.topologies = [
      ...this.topologies.filter((entry) => !entry.id().equals(topology.id())),
      topology,
    ];
  }

  registerSection(gameId: GameId, validator: ILevelSectionValidator): void {
    this.sections = [
      ...this.sections.filter((entry) => !entry.gameId.equals(gameId)),
      { gameId, validator },
    ];
  }

  sectionKeyOf(gameId: GameId): SectionKey {
    return this.sectionFor(gameId).sectionKey();
  }

  validate(level: Level): void {
    const section = this.sectionFor(level.gameId);
    if (!section.sectionKey().equals(level.section.sectionKey())) {
      throw new DomainError(ErrorCode.WrongLevelSection);
    }
    const topology = this.topologyFor(level.board.topology);
    if (
      !level.board.cells.every((cell) =>
        cell.size().equals(topology.coordinateSize()),
      )
    ) {
      throw new DomainError(ErrorCode.InvalidBoard);
    }
    if (!cellsConnected(level.board.cells, topology)) {
      throw new DomainError(ErrorCode.BoardNotConnected);
    }
    section.validate(level, topology);
  }

  private sectionFor(gameId: GameId): ILevelSectionValidator {
    for (const entry of this.sections) {
      if (entry.gameId.equals(gameId)) return entry.validator;
    }
    throw new DomainError(ErrorCode.UnknownGame);
  }

  private topologyFor(id: TopologyId): IBoardTopology {
    for (const topology of this.topologies) {
      if (topology.id().equals(id)) return topology;
    }
    throw new DomainError(ErrorCode.UnknownTopology);
  }
}
