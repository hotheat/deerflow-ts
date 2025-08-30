import { Injectable } from '@nestjs/common';
import { StateGraph, START, END } from '@langchain/langgraph';
import { ChatOpenAI } from '@langchain/openai';
import { BaseMessage, HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import { ChatStateAnnotation, ChatGraphState } from './state/ChatWorkflowState';
import { ChatWorkflowAdapterPort } from '@core/domain/chat/port/persistence/ChatWorkflowAdapterPort';
import { StreamChatConfig, StreamChatResponseDto } from '@core/domain/chat/port/dto/StreamChatDto';
import { StreamModeStrategy, StreamModeStrategyFactory } from './strategy/StreamModeStrategy';
import { LLMConfig } from '@infrastructure/config/LLMConfig';
import { LangGraphValue } from '@core/common/type/CommonTypes';
import { Code } from '@core/common/code/Code';
import { Exception } from '@core/common/exception/Exception';

/**
 * LangGraph workflow adapter implementation.
 * Provides clean interface for LangGraph operations with proper error handling.
 */
@Injectable()
export class LangGraphChatAdapter implements ChatWorkflowAdapterPort {
  private llm: ChatOpenAI;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private graph: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private compiledGraph: any;

  constructor() {
    this.initializeLLM();
    this.buildGraph();
  }

  /**
   * Initialize ChatOpenAI with configuration.
   */
  private initializeLLM(): void {
    try {
      if (!LLMConfig.OPENAI_API_KEY) {
        throw Exception.new({
          code: Code.LLM_CONFIGURATION_ERROR,
          overrideMessage: 'OpenAI API Key is required but not configured',
        });
      }

      const model: string = LLMConfig.DEFAULT_MODEL;
      this.llm = new ChatOpenAI({
        model: model,
        temperature: LLMConfig.TEMPERATURE,
        maxTokens: LLMConfig.MAX_TOKENS,
        streaming: true,
        openAIApiKey: LLMConfig.OPENAI_API_KEY,
        ...(LLMConfig.OPENAI_API_BASE && {
          configuration: {
            baseURL: LLMConfig.OPENAI_API_BASE,
          },
        }),
      });
    } catch (error) {
      throw Exception.new({
        code: Code.LLM_CONFIGURATION_ERROR,
        overrideMessage: error instanceof Error ? error.message : 'Failed to initialize LLM',
        data: { error: error instanceof Error ? error.message : String(error) }
      });
    }
  }

  /**
   * Build and compile the LangGraph workflow.
   */
  private buildGraph(): void {
    try {
      this.graph = new StateGraph(ChatStateAnnotation)
        .addNode('agent', this.chatNode.bind(this))
        .addEdge(START, 'agent')
        .addEdge('agent', END);

      this.compiledGraph = this.graph.compile();
    } catch (error) {
      throw Exception.new({
        code: Code.CHAT_WORKFLOW_ERROR,
        overrideMessage: 'Failed to build LangGraph workflow',
        data: { error: error instanceof Error ? error.message : String(error) }
      });
    }
  }

  /**
   * Chat node implementation with proper error handling.
   */
  private async chatNode(state: ChatGraphState): Promise<Partial<ChatGraphState>> {
    try {
      if (!state.messages || state.messages.length === 0) {
        throw Exception.new({
          code: Code.CHAT_STATE_ERROR,
          overrideMessage: 'No messages provided to chat node',
        });
      }

      const response: AIMessage = await this.llm.invoke(state.messages) as AIMessage;
      
      return {
        messages: [response],
      };
    } catch (error) {
      const errorMessage: string = error instanceof Error ? error.message : 'Unknown error occurred in chat node';
      
      throw Exception.new({
        code: Code.LLM_INVOCATION_ERROR,
        overrideMessage: errorMessage,
        data: { 
          state: { messageCount: state.messages?.length || 0 },
          error: error instanceof Error ? error.message : String(error) 
        }
      });
    }
  }

  /**
   * Stream chat workflow with improved architecture.
   */
  public async* streamChatWorkflow(
    messages: BaseMessage[],
    config: StreamChatConfig = {}
  ): AsyncIterableIterator<StreamChatResponseDto> {
    try {
      // Validate inputs
      this.validateStreamInputs(messages, config);

      const inputs: ChatGraphState = {
        messages,
      };

      // Build stream configuration
      const streamConfig: Record<string, LangGraphValue> = {
        streamMode: Array.isArray(config.streamMode) ? config.streamMode[0] : config.streamMode || 'updates',
        ...(config.recursionLimit && { recursionLimit: config.recursionLimit }),
        ...(config.threadId && { configurable: { thread_id: config.threadId } }),
        ...(config.subgraphs !== undefined && { subgraphs: config.subgraphs })
      };

      const mode: string = Array.isArray(config.streamMode) ? config.streamMode[0] : config.streamMode || 'updates';
      const strategy: StreamModeStrategy = StreamModeStrategyFactory.getStrategy(mode);

      yield {
        event: 'start',
        data: {
          timestamp: new Date().toISOString()
        }
      };

      // Stream from compiled graph
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const stream: any = await this.compiledGraph.stream(inputs, streamConfig);

      for await (const chunk of stream) {
        console.log('LangGraphAdapter chunk:', JSON.stringify(chunk, null, 2));
        const processedEvent: StreamChatResponseDto | null = strategy.processChunk(chunk);
        
        if (processedEvent) {
          console.log('Processed event:', processedEvent);
          yield processedEvent;
        } else {
          console.log('No processed event from chunk');
        }
      }

      yield {
        event: 'complete',
        data: {
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      yield {
        event: 'error',
        data: {
          message: error instanceof Exception ? error.message : 
            error instanceof Error ? error.message : 'Stream execution failed',
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Convert message role to LangChain message format.
   */
  public convertToLangChainMessage(role: string, content: string): BaseMessage {
    if (!role || !content) {
      throw Exception.new({
        code: Code.CHAT_WORKFLOW_ERROR,
        overrideMessage: 'Role and content are required for message conversion',
        data: { role, content }
      });
    }

    switch (role.toLowerCase()) {
    case 'user':
    case 'human':
      return new HumanMessage(content);
    case 'assistant':
    case 'ai':
      return new AIMessage(content);
    case 'system':
      return new SystemMessage(content);
    default:
      throw Exception.new({
        code: Code.CHAT_WORKFLOW_ERROR,
        overrideMessage: `Unsupported message role: ${role}`,
        data: { role, content, supportedRoles: ['user', 'human', 'assistant', 'ai', 'system'] }
      });
    }
  }

  /**
   * Validate streaming inputs.
   */
  private validateStreamInputs(messages: BaseMessage[], config: StreamChatConfig): void {
    if (!messages || !Array.isArray(messages)) {
      throw Exception.new({
        code: Code.CHAT_WORKFLOW_ERROR,
        overrideMessage: 'Messages must be a non-empty array',
        data: { messagesType: typeof messages, messagesLength: messages ? (messages as BaseMessage[]).length : 'N/A' }
      });
    }

    if (messages.length === 0) {
      throw Exception.new({
        code: Code.CHAT_WORKFLOW_ERROR,
        overrideMessage: 'At least one message is required',
      });
    }

    // Validate stream mode if provided
    if (config.streamMode && typeof config.streamMode === 'string') {
      const supportedModes: string[] = StreamModeStrategyFactory.getSupportedModes();
      if (!supportedModes.includes(config.streamMode)) {
        throw Exception.new({
          code: Code.STREAM_PROCESSING_ERROR,
          overrideMessage: `Unsupported stream mode: ${config.streamMode}`,
          data: { providedMode: config.streamMode, supportedModes }
        });
      }
    }
  }
}