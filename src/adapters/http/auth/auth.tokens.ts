// Injection token: lets the composition root hand the controller its use
// case without the controller naming a concrete class.
export const REGISTER_USE_CASE = Symbol('RegisterUseCase');
