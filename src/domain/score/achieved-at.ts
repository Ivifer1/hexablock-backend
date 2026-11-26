import { DomainError } from '../shared/domain-error.js';
import { ErrorCode } from '../shared/error-code.js';

export class AchievedAt {
  private constructor(private readonly milliseconds: number) {}

  static of(date: Date): AchievedAt {
    const milliseconds = date.getTime();
    if (!Number.isFinite(milliseconds)) {
      throw new DomainError(ErrorCode.InvalidAchievedAt);
    }
    return new AchievedAt(milliseconds);
  }

  toDate(): Date {
    return new Date(this.milliseconds);
  }
}
