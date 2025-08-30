export class MediaDITokens {
  
  // Use-cases
  
  public static readonly CreateMediaInterface: unique symbol  = Symbol('CreateMediaInterface');
  public static readonly EditMediaInterface: unique symbol    = Symbol('EditMediaInterface');
  public static readonly GetMediaListInterface: unique symbol = Symbol('GetMediaListInterface');
  public static readonly GetMediaInterface: unique symbol     = Symbol('GetMediaInterface');
  public static readonly RemoveMediaInterface: unique symbol  = Symbol('RemoveMediaInterface');
  
  
  // Repositories
  
  public static readonly MediaRepository: unique symbol  = Symbol('MediaRepository');
  public static readonly MediaFileStorage: unique symbol = Symbol('MediaFileStorage');
  
}
