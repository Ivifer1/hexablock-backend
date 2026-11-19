import { DomainError } from '../shared/domain-error.js';
import { ErrorCode } from '../shared/error-code.js';

export class LocalizedName {
  private constructor(
    private readonly es: string,
    private readonly en: string,
  ) {}

  static of(es: string, en: string): LocalizedName {
    if (es.trim().length === 0 || en.trim().length === 0) {
      throw new DomainError(ErrorCode.InvalidLevelName);
    }
    return new LocalizedName(es, en);
  }

  equals(other: LocalizedName): boolean {
    return this.es === other.es && this.en === other.en;
  }
}
