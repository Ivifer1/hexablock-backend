// A value that may be absent. The domain never passes null or undefined
// around: an absent value is an empty Optional.
export class Optional<T> {
  private constructor(
    private readonly present: boolean,
    private readonly value?: T,
  ) {}

  static of<T>(value: T): Optional<T> {
    return new Optional<T>(true, value);
  }

  static empty<T>(): Optional<T> {
    return new Optional<T>(false);
  }

  isPresent(): boolean {
    return this.present;
  }

  get(): T {
    if (!this.present) {
      throw new Error('Optional is empty');
    }
    return this.value as T;
  }

  orElse(fallback: T): T {
    return this.present ? (this.value as T) : fallback;
  }
}
