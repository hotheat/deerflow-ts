import { Inject, Injectable } from '@nestjs/common';
import { ValidatorAdapter } from '@core/common/adapter/validator/ValidatorAdapter';
import { BaseMessage } from '@langchain/core/messages';
import { ChatWorkflowAdapterPort } from '@core/domain/chat/port/persistence/ChatWorkflowAdapterPort';
import { ChatStreamRepositoryPort } from '@core/domain/chat/port/persistence/ChatStreamRepositoryPort';
import { ChatStream } from '@core/domain/chat/entity/ChatStream';
import { ChatDITokens } from '@core/domain/chat/di/ChatDITokens';
import { StreamChatInterface } from '@core/domain/chat/interface/StreamChatInterface';
import { StreamChatDto, StreamChatResponseDto, StreamChatConfig } from '@core/domain/chat/port/dto/StreamChatDto';
import { Code } from '@core/common/code/Code';
import { Exception } from '@core/common/exception/Exception';

/**
 * Legacy interface for backward compatibility.
 * @deprecated Use StreamChatDto from domain layer instead.
 */
export interface LegacyStreamChatDto {
  executorId: string;
  message: string;
  threadId?: string;
  model?: string;
  streamMode?: 'values' | 'updates' | 'messages' | 'custom' | string[] | string;
  subgraphs?: boolean;
  recursionLimit?: number;
}

@Injectable()
export class StreamChatService extends ValidatorAdapter implements StreamChatInterface {

  constructor(
    @Inject(ChatDITokens.ChatWorkflowAdapterPort)
    private readonly chatWorkflowAdapter: ChatWorkflowAdapterPort,
    @Inject(ChatDITokens.ChatStreamRepository)
    private readonly chatStreamRepository: ChatStreamRepositoryPort,
  ) {
    super();
  }

  /**
   * New architecture-compliant execute method.
   */
  public async execute(port: StreamChatDto): Promise<AsyncIterableIterator<StreamChatResponseDto>> {
    try {
      await this.validateDto(port);

      if (!port.messages || port.messages.length === 0) {
        throw Exception.new({
          code: Code.CHAT_WORKFLOW_ERROR,
          overrideMessage: 'Messages array cannot be empty',
          data: { messages: port.messages }
        });
      }

      return this.chatWorkflowAdapter.streamChatWorkflow(port.messages, port.config);

    } catch (error) {
      throw Exception.new({
        code: Code.CHAT_WORKFLOW_ERROR,
        overrideMessage: error instanceof Error ? error.message : 'Unknown chat service error',
        data: { port, error: error instanceof Error ? error.message : String(error) }
      });
    }
  }

  private async validateDto(port: StreamChatDto): Promise<void> {
    if (!port) {
      throw Exception.new({
        code: Code.USE_CASE_PORT_VALIDATION_ERROR,
        overrideMessage: 'StreamChatDto is required',
      });
    }

    if (!port.messages) {
      throw Exception.new({
        code: Code.USE_CASE_PORT_VALIDATION_ERROR,
        overrideMessage: 'Messages array is required',
        data: { port }
      });
    }
  }


  /**
   * Legacy method for backward compatibility.
   * @deprecated Use the new execute method with StreamChatDto instead.
   */
  public async executeLegacy(port: LegacyStreamChatDto): Promise<AsyncIterableIterator<string>> {
    // Get or create chat stream
    let chatStream: ChatStream;
    if (port.threadId) {
      const existingChatStream: ChatStream | null = await this.chatStreamRepository.findByThreadId(port.threadId);
      if (existingChatStream) {
        chatStream = existingChatStream;
      } else {
        chatStream = await ChatStream.new({
          threadId: port.threadId,
          messages: []
        });
      }
    } else {
      const newThreadId: string = `thread_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      chatStream = await ChatStream.new({
        threadId: newThreadId,
        messages: []
      });
    }

    // Add user message to chat history
    const userMessage: { role: string; content: string; timestamp: string } = {
      role: 'user',
      content: port.message,
      timestamp: new Date().toISOString()
    };

    const updatedMessages: Array<{
      role: string;
      content: string;
      timestamp: string
    }> = [...chatStream.messages, userMessage];
    chatStream.updateMessages(updatedMessages);

    // Convert to LangChain message format
    const langChainMessages: BaseMessage[] = updatedMessages.map(msg =>
      this.chatWorkflowAdapter.convertToLangChainMessage(msg.role, msg.content)
    );

    // Use direct streaming for token-by-token output with config from port
    const streamMode: 'values' | 'updates' | 'messages' | 'custom' | 'debug' = 
      Array.isArray(port.streamMode) ? port.streamMode[0] as 'values' | 'updates' | 'messages' | 'custom' | 'debug' || 'updates' :
        (port.streamMode as 'values' | 'updates' | 'messages' | 'custom' | 'debug') || 'updates';

    const workflowConfig: StreamChatConfig = {
      threadId: chatStream.threadId,
      streamMode: streamMode,
      subgraphs: port.subgraphs,
      recursionLimit: port.recursionLimit
    };

    return this.wrapStreamWithPersistence(
      this.chatWorkflowAdapter.streamChatWorkflow(langChainMessages, workflowConfig),
      chatStream
    );
  }

  private async* wrapStreamWithPersistence(
    stream: AsyncIterableIterator<StreamChatResponseDto>,
    chatStream: ChatStream
  ): AsyncIterableIterator<string> {
    let fullContent: string = '';
    let isFirstChunk: boolean = true;

    try {
      for await (const {event, data} of stream) {
        if (event === 'chunk') {
          fullContent += (data as { content: string }).content;

          // Save user message on first chunk
          if (isFirstChunk) {
            await this.chatStreamRepository.save(chatStream);
            isFirstChunk = false;
          }

          yield (data as { content: string }).content;
        } else if (event === 'complete') {
          // Final response received, save it
          if ((data as { finalResponse?: string }).finalResponse) {
            fullContent = (data as { finalResponse: string }).finalResponse;
          }
        } else if (event === 'error') {
          throw new Error((data as { message: string }).message);
        }
      }

      // Save complete AI response after stream ends
      if (fullContent) {
        const aiMessage: { role: string; content: string; timestamp: string } = {
          role: 'assistant',
          content: fullContent,
          timestamp: new Date().toISOString()
        };

        const finalMessages: Array<{
          role: string;
          content: string;
          timestamp: string
        }> = [...chatStream.messages, aiMessage];
        chatStream.updateMessages(finalMessages);
        await this.chatStreamRepository.save(chatStream);
      }

    } catch (error) {
      // Error handling: save partial content if available
      if (fullContent) {
        const errorMessage: { role: string; content: string; timestamp: string } = {
          role: 'assistant',
          content: fullContent + '\n[Error occurred during generation]',
          timestamp: new Date().toISOString()
        };

        const errorMessages: Array<{
          role: string;
          content: string;
          timestamp: string
        }> = [...chatStream.messages, errorMessage];
        chatStream.updateMessages(errorMessages);
        await this.chatStreamRepository.save(chatStream);
      }
      throw error;
    }
  }
}