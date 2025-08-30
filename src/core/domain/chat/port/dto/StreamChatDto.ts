import { BaseMessage } from '@langchain/core/messages';

/**
 * Input port for streaming chat use case.
 * Defines the contract for initiating a chat stream.
 */
export interface StreamChatDto {
  messages: BaseMessage[];
  config?: StreamChatConfig;
}

/**
 * Output port for streaming chat use case.
 * Defines the structure of streaming chat responses.
 */
export interface StreamChatResponseDto {
  event: 'chunk' | 'complete' | 'error' | 'start';
  data: {
    content?: string;
    node?: string;
    finalResponse?: string;
    message?: string;
    timestamp: string;
  };
}

/**
 * Configuration for chat streaming behavior.
 */
export interface StreamChatConfig {
  threadId?: string;
  recursionLimit?: number;
  streamMode?: 'values' | 'updates' | 'messages' | 'custom' | 'debug';
  subgraphs?: boolean;
}