import { IClock } from '../../application/ports/clock.js';

// Adapter: the real clock of the machine.
export class SystemClock implements IClock {
  now(): Date {
    return new Date();
  }
}
