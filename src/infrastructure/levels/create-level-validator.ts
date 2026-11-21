import { GameId } from '../../domain/game/game-id.js';
import { HexaFitSectionValidator } from '../../domain/level/fit/hexa-fit-section-validator.js';
import { LevelValidator } from '../../domain/level/level-validator.js';
import { HexaSortSectionValidator } from '../../domain/level/sort/hexa-sort-section-validator.js';
import { HexAxialTopology } from '../../domain/level/topology/hex-axial-topology.js';

export function createLevelValidator(): LevelValidator {
  const validator = new LevelValidator();
  validator.registerTopology(new HexAxialTopology());
  validator.registerSection(
    GameId.of('hexa-fit'),
    new HexaFitSectionValidator(),
  );
  validator.registerSection(
    GameId.of('hexa-sort'),
    new HexaSortSectionValidator(),
  );
  return validator;
}
