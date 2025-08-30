import { BaseMessage } from '@langchain/core/messages';
import { StreamChatConfig, StreamChatResponseDto } from '../dto/StreamChatDto';

/**
 * Port for ChatWorkflow adapter.
 * Defines the interface for LangGraph workflow operations.
 */
export interface ChatWorkflowAdapterPort {
  /**
   * Stream chat workflow execution.
   * @param messages - Array of conversation messages
   * @param config - Optional streaming configuration
   * @returns AsyncIterableIterator of streaming events
   */
  streamChatWorkflow(
    messages: BaseMessage[], 
    config?: StreamChatConfig
  ): AsyncIterableIterator<StreamChatResponseDto>;

  /**
   * Convert message role to LangChain message format.
   * @param role - Message role (user, assistant, system)
   * @param content - Message content
   * @returns Properly typed LangChain BaseMessage
   */
  convertToLangChainMessage(role: string, content: string): BaseMessage;
}