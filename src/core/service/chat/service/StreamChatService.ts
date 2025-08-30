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
}