export class PostDITokens {
  
  // Use-cases
  
  public static readonly CreatePostInterface: unique symbol  = Symbol('CreatePostInterface');
  public static readonly EditPostInterface: unique symbol    = Symbol('EditPostInterface');
  public static readonly GetPostListInterface: unique symbol = Symbol('GetPostListInterface');
  public static readonly GetPostInterface: unique symbol     = Symbol('GetPostInterface');
  public static readonly PublishPostInterface: unique symbol = Symbol('PublishPostInterface');
  public static readonly RemovePostInterface: unique symbol  = Symbol('RemovePostInterface');
  
  
  // Repositories
  
  public static readonly PostRepository: unique symbol  = Symbol('PostRepository');
  
}
