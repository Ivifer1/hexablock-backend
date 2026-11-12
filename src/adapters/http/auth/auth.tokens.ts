// Injection tokens: let the composition root hand the controller its use
// cases without the controller naming a concrete class.
export const REGISTER_USE_CASE = Symbol('RegisterUseCase');
export const LOGIN_USE_CASE = Symbol('LoginUseCase');
export const GET_CURRENT_USER_USE_CASE = Symbol('GetCurrentUserUseCase');
