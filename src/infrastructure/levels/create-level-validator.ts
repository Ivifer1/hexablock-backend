import { LevelValidator } from '../../domain/level/level-validator.js';
import { HexAxialTopology } from '../../domain/level/topology/hex-axial-topology.js';

export function createLevelValidator(): LevelValidator {
  const validator = new LevelValidator();
  validator.registerTopology(new HexAxialTopology());
  return validator;
}
