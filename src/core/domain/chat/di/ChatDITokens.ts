export class ChatDITokens {
  
  // Use Cases
  
  public static readonly StreamChatInterface: unique symbol = Symbol('StreamChatInterface');
  
  // Repositories
  
  public static readonly ChatStreamRepository: unique symbol = Symbol('ChatStreamRepository');
  
  // Adapters
  
  public static readonly ChatWorkflowAdapterPort: unique symbol = Symbol('ChatWorkflowAdapterPort');
  
  // Legacy (to be replaced)
  
  public static readonly ChatWorkflow: unique symbol = Symbol('ChatWorkflow');
  
}