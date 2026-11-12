// Input port shared by every use case. Because all of them have this one
// shape, cross-cutting aspects (logging, caching) can wrap any use case as a
// decorator without knowing which one it is.
export interface IUseCase<TInput, TOutput> {
  execute(input: TInput): Promise<TOutput>;
}
