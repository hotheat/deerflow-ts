import { Annotation } from '@langchain/langgraph';
import { BaseMessage } from '@langchain/core/messages';

/**
 * Standard LangGraph state annotation following best practices.
 * Only contains messages array as recommended by LangGraph documentation.
 * Custom fields have been removed to prevent concurrent update issues.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const ChatStateAnnotation: any = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (current: BaseMessage[], update: BaseMessage[]) => current.concat(update),
    default: () => [],
  }),
});

export type ChatGraphState = typeof ChatStateAnnotation.State;

/**
 * Configuration options for workflow execution.
 * Supports all LangGraph streaming modes and execution controls.
 */
export interface WorkflowExecutionConfig {
  threadId?: string;
  recursionLimit?: number;
  streamMode?: 'values' | 'updates' | 'messages' | 'custom' | 'debug' | string[] | string;
  subgraphs?: boolean;
}

/**
 * Stream event types for ChatWorkflow responses.
 * Provides consistent event structure for streaming responses.
 */
export interface ChatStreamEvent {
  event: 'chunk' | 'complete' | 'error' | 'start';
  data: {
    content?: string;
    node?: string;
    finalResponse?: string;
    message?: string;
    timestamp: string;
  };
}