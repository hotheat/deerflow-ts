export class UserDITokens {
  
  // Use-cases
  
  public static readonly CreateUserInterface: unique symbol  = Symbol('CreateUserInterface');
  public static readonly GetUserInterface: unique symbol     = Symbol('GetUserInterface');
  
  
  // Repositories
  
  public static readonly UserRepository: unique symbol  = Symbol('UserRepository');
  
}
