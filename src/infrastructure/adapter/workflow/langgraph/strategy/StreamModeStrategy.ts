import { BaseMessage } from '@langchain/core/messages';
import { ChatStreamEvent } from '../state/ChatWorkflowState';
import { LangGraphValue } from '@core/common/type/CommonTypes';

/**
 * Strategy interface for processing different streaming modes.
 */
export interface StreamModeStrategy {
  /**
   * Process chunk from LangGraph stream based on the specific mode.
   * @param chunk - Raw chunk from LangGraph stream (can be array or object)
   * @returns Processed chat stream event or null if chunk should be ignored
   */
  processChunk(chunk: Record<string, LangGraphValue> | Array<Record<string, LangGraphValue>>): ChatStreamEvent | null;

  /**
   * Get the strategy identifier.
   */
  getMode(): string;
}

/**
 * Strategy for 'values' streaming mode.
 * Handles complete state snapshots after each step.
 */
export class ValuesStreamStrategy implements StreamModeStrategy {
  public getMode(): string {
    return 'values';
  }

  public processChunk(chunk: Record<string, LangGraphValue> | Array<Record<string, LangGraphValue>>): ChatStreamEvent | null {
    if (!chunk || typeof chunk !== 'object') {
      return null;
    }

    // Values mode provides complete state
    if ('messages' in chunk && Array.isArray(chunk.messages)) {
      const messages: BaseMessage[] = chunk.messages as BaseMessage[];
      const lastMessage: BaseMessage | undefined = messages[messages.length - 1];
      
      if (lastMessage && lastMessage.content) {
        return {
          event: 'chunk',
          data: {
            content: String(lastMessage.content),
            node: 'agent',
            timestamp: new Date().toISOString()
          }
        };
      }
    }

    return null;
  }
}

/**
 * Strategy for 'updates' streaming mode.
 * Handles state updates for each node execution.
 */
export class UpdatesStreamStrategy implements StreamModeStrategy {
  public getMode(): string {
    return 'updates';
  }

  public processChunk(chunk: Record<string, LangGraphValue> | Array<Record<string, LangGraphValue>>): ChatStreamEvent | null {
    console.log('UpdatesStrategy chunk:', JSON.stringify(chunk, null, 2));
    if (!chunk) {
      return null;
    }

    // Handle LangGraph updates format which can be either array or object
    let updateData: Record<string, LangGraphValue> = {};
    
    if (Array.isArray(chunk) && chunk.length > 1 && typeof chunk[1] === 'object' && chunk[1]) {
      // LangGraph returns [previous_state, current_updates] format
      updateData = chunk[1] as Record<string, LangGraphValue>;
    } else if (typeof chunk === 'object' && !Array.isArray(chunk)) {
      // Standard object format
      updateData = chunk;
    } else {
      return null;
    }

    // Updates mode provides node-specific updates
    for (const [node, nodeUpdate] of Object.entries(updateData)) {
      if (nodeUpdate && typeof nodeUpdate === 'object') {
        const nodeState: Record<string, LangGraphValue> = nodeUpdate as Record<string, LangGraphValue>;
        
        // Check for messages array in node update
        if ('messages' in nodeState && Array.isArray(nodeState.messages)) {
          const messages: Array<Record<string, LangGraphValue>> = nodeState.messages as Array<Record<string, LangGraphValue>>;
          
          for (const message of messages) {
            // Handle LangChain message format
            let content: string = '';
            if (message && typeof message === 'object') {
              if (message.content) {
                content = String(message.content);
              } else if (message.kwargs && typeof message.kwargs === 'object' && message.kwargs !== null && 'content' in message.kwargs) {
                const kwargs: Record<string, LangGraphValue> = message.kwargs as Record<string, LangGraphValue>;
                if (kwargs.content) {
                  content = String(kwargs.content);
                }
              }
            }
            
            if (content) {
              return {
                event: 'chunk',
                data: {
                  content: content,
                  node: node,
                  timestamp: new Date().toISOString()
                }
              };
            }
          }
        }
      }
    }

    return null;
  }
}

/**
 * Strategy for 'messages' streaming mode.
 * Handles streaming of individual messages and tool calls.
 */
export class MessagesStreamStrategy implements StreamModeStrategy {
  public getMode(): string {
    return 'messages';
  }

  public processChunk(chunk: Record<string, LangGraphValue> | Array<Record<string, LangGraphValue>>): ChatStreamEvent | null {
    console.log('chunk>>>>>>>>', chunk);
    if (!chunk || typeof chunk !== 'object') {
      return null;
    }

    // Messages mode streams individual messages
    if ('messages' in chunk && Array.isArray(chunk.messages)) {
      const messages: BaseMessage[] = chunk.messages as BaseMessage[];
      
      for (const message of messages) {
        if (message && message.content) {
          return {
            event: 'chunk',
            data: {
              content: String(message.content),
              node: 'agent',
              timestamp: new Date().toISOString()
            }
          };
        }
      }
    }

    return null;
  }
}

/**
 * Factory for creating streaming strategies.
 */
export class StreamModeStrategyFactory {
  private static strategies: Map<string, StreamModeStrategy> = new Map([
    ['values', new ValuesStreamStrategy()],
    ['updates', new UpdatesStreamStrategy()],
    ['messages', new MessagesStreamStrategy()],
  ]);

  public static getStrategy(mode: string): StreamModeStrategy {
    const strategy: StreamModeStrategy | undefined = this.strategies.get(mode);
    
    if (!strategy) {
      // Default to updates strategy for unknown modes
      const defaultStrategy: StreamModeStrategy | undefined = this.strategies.get('updates');
      if (!defaultStrategy) {
        throw new Error('Default updates strategy not found');
      }
      return defaultStrategy;
    }
    
    return strategy;
  }

  public static getSupportedModes(): string[] {
    return Array.from(this.strategies.keys());
  }
}