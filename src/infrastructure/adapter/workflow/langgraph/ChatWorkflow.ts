import {Injectable} from '@nestjs/common';
import {StateGraph, START, END} from '@langchain/langgraph';
import {ChatOpenAI} from '@langchain/openai';
import {BaseMessage, HumanMessage, AIMessage, SystemMessage} from '@langchain/core/messages';
import {ChatStateAnnotation, WorkflowExecutionConfig, ChatGraphState} from './state/ChatWorkflowState';
import {LLMConfig} from '@infrastructure/config/LLMConfig';

@Injectable()
export class ChatWorkflow {
  private llm: ChatOpenAI;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private graph: any;

  constructor() {
    this.initializeLLM();
    this.buildGraph();
  }

  private initializeLLM(): void {
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
  }

  private buildGraph(): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const workflow: any = new StateGraph(ChatStateAnnotation)
      .addNode('agent', this.chatNode.bind(this))
      .addEdge(START, 'agent')
      .addEdge('agent', END);

    this.graph = workflow.compile();
  }

  private async chatNode(state: ChatGraphState): Promise<Partial<ChatGraphState>> {
    try {
      const response: AIMessage = await this.llm.invoke(state.messages as BaseMessage[]) as AIMessage;

      return {
        messages: [response],
      };
    } catch (error) {
      // Return empty messages array for error state
      return {
        messages: [],
      };
    }
  }

  public async* streamChatWorkflow(
    messages: BaseMessage[],
    config: WorkflowExecutionConfig = {}
  ): AsyncIterableIterator<{
    event: string;
    data: { content?: string; node?: string; finalResponse?: string; message?: string; timestamp: string }
  }> {
    try {
      const inputs: ChatGraphState = {
        messages,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const streamConfig: any = {
        streamMode: config.streamMode || 'updates',
        ...(config.recursionLimit && {recursionLimit: config.recursionLimit}),
        ...(config.threadId && {configurable: {thread_id: config.threadId}}),
        ...(config.subgraphs !== undefined && {subgraphs: config.subgraphs})
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const stream: any = await this.graph.stream(inputs, streamConfig);

      for await (const chunk of stream) {
        const streamMode: string = Array.isArray(config.streamMode) ? config.streamMode[0] : config.streamMode || 'updates';

        if (streamMode === 'values') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const state: any = chunk as any;
          if (state && typeof state === 'object') {
            if (state.currentResponse && typeof state.currentResponse === 'string') {
              yield {
                event: 'chunk',
                data: {
                  content: state.currentResponse,
                  node: 'agent',
                  timestamp: new Date().toISOString()
                }
              };
            }

            if (state.isComplete) {
              yield {
                event: 'complete',
                data: {
                  node: 'agent',
                  finalResponse: state.currentResponse || '',
                  timestamp: new Date().toISOString()
                }
              };
            }

            if (state.error && typeof state.error === 'string') {
              yield {
                event: 'error',
                data: {
                  message: state.error,
                  timestamp: new Date().toISOString()
                }
              };
            }
          }
        } else if (streamMode === 'messages') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const state: any = chunk as any;
          if (state && typeof state === 'object' && Array.isArray(state.messages)) {
            for (const message of state.messages) {
              if (message && message.content) {
                yield {
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
        } else {
          // Handle 'updates' mode - each chunk is an object with node names as keys
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const updateChunk: any = chunk as any;
          if (updateChunk && typeof updateChunk === 'object') {
            for (const [node, nodeUpdate] of Object.entries(updateChunk)) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const nodeState: any = nodeUpdate as any;

              if (nodeState && typeof nodeState === 'object') {
                // Check if nodeState has messages (typical for updates mode)
                if (Array.isArray(nodeState.messages)) {
                  const lastMessage: BaseMessage = nodeState.messages[nodeState.messages.length - 1];
                  if (lastMessage && lastMessage.content) {
                    yield {
                      event: 'chunk',
                      data: {
                        content: String(lastMessage.content),
                        node,
                        timestamp: new Date().toISOString()
                      }
                    };
                  }
                }

                // Handle custom response fields
                if (nodeState.currentResponse && typeof nodeState.currentResponse === 'string') {
                  yield {
                    event: 'chunk',
                    data: {
                      content: nodeState.currentResponse,
                      node,
                      timestamp: new Date().toISOString()
                    }
                  };
                }

                if (nodeState.isComplete) {
                  yield {
                    event: 'complete',
                    data: {
                      node,
                      finalResponse: nodeState.currentResponse || (
                        Array.isArray(nodeState.messages) && nodeState.messages.length > 0
                          ? String(nodeState.messages[nodeState.messages.length - 1].content || '')
                          : ''
                      ),
                      timestamp: new Date().toISOString()
                    }
                  };
                }

                if (nodeState.error && typeof nodeState.error === 'string') {
                  yield {
                    event: 'error',
                    data: {
                      message: nodeState.error,
                      timestamp: new Date().toISOString()
                    }
                  };
                }
              }
            }
          }
        }
      }
    } catch (error) {
      yield {
        event: 'error',
        data: {
          message: error instanceof Error ? error.message : 'Stream execution failed',
          timestamp: new Date().toISOString()
        }
      };
    }
  }


  public static convertToLangChainMessage(role: string, content: string): BaseMessage {
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
      throw new Error(`Unsupported message role: ${role}`);
    }
  }
}