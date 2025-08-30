import {Controller, Post, Body, Res, HttpCode, HttpStatus, Inject} from '@nestjs/common';
import {ApiTags, ApiResponse, ApiBearerAuth, ApiBody} from '@nestjs/swagger';
import {Response} from 'express';
import {HttpAuth} from '@application/api/http-rest/auth/decorator/HttpAuth';
import {HttpUser} from '@application/api/http-rest/auth/decorator/HttpUser';
import {HttpUserPayload} from '@application/api/http-rest/auth/type/HttpAuthTypes';
import {UserRole} from '@core/common/enums/UserEnums';
import {SSEAdapter} from '@infrastructure/adapter/streaming/SSEAdapter';
import {ChatStream} from '@core/domain/chat/entity/ChatStream';
import {ChatStreamRepositoryPort} from '@core/domain/chat/port/persistence/ChatStreamRepositoryPort';
import {ChatDITokens} from '@core/domain/chat/di/ChatDITokens';
import { StreamChatService } from '@core/service/chat/service/StreamChatService';
import { StreamChatDto, StreamChatResponseDto } from '@core/domain/chat/port/dto/StreamChatDto';
import { BaseMessage, HumanMessage } from '@langchain/core/messages';

@Controller('chat')
@ApiTags('chat')
export class ChatController {

  constructor(
    @Inject(ChatDITokens.ChatStreamRepository)
    private readonly chatStreamRepository: ChatStreamRepositoryPort,
    private readonly streamChatService: StreamChatService,
  ) {
  }

  @Post('stream')
  @HttpAuth(UserRole.AUTHOR, UserRole.ADMIN, UserRole.GUEST)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiBody({
    type: 'object',
    schema: {
      type: 'object',
      properties: {
        message: {type: 'string', description: 'The message to send'},
        threadId: {type: 'string', description: 'Unique thread identifier'}
      },
      required: ['message', 'threadId']
    }
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Server-Sent Events stream',
    headers: {
      'Content-Type': {description: 'text/event-stream'},
      'Cache-Control': {description: 'no-cache'},
      'Connection': {description: 'keep-alive'}
    }
  })
  public async streamChat(
    @HttpUser() user: HttpUserPayload,
    @Body() body: { message: string; threadId: string },
    @Res() response: Response
  ): Promise<void> {
    // 设置SSE响应头
    response.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    try {
      
      // 创建用户消息
      const userMessage: BaseMessage = new HumanMessage(body.message);
      
      // 准备StreamChatService参数使用新架构
      const streamChatDto: StreamChatDto = {
        messages: [userMessage],
        config: {
          streamMode: 'updates',
          subgraphs: true,
          threadId: body.threadId,
          recursionLimit: 50
        }
      };

      const contentStream: AsyncIterableIterator<StreamChatResponseDto> = await this.streamChatService.execute(
        streamChatDto,
      );

      // 处理流式输出
      for await (const streamEvent of contentStream) {
        console.log('streamEvent<<<<<<<', streamEvent);
        if (streamEvent.event === 'chunk' && streamEvent.data.content) {
          const formattedChunk: string = SSEAdapter.formatSSEChunk(streamEvent.data.content);
          response.write(formattedChunk);
        } else if (streamEvent.event === 'error') {
          const errorMessage: string = streamEvent.data.message || 'Unknown streaming error';
          response.write(SSEAdapter.formatSSEError(errorMessage));
          break;
        }
      }

      // 发送完成事件
      response.write(SSEAdapter.formatSSEComplete());

    } catch (error) {
      const errorMessage: string = error instanceof Error ? error.message : 'Unknown error occurred';
      response.write(SSEAdapter.formatSSEError(errorMessage));
    } finally {
      response.end();
    }
  }

  @Post('streams')
  @HttpAuth(UserRole.AUTHOR, UserRole.ADMIN, UserRole.GUEST)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        threadId: {type: 'string', description: 'Unique thread identifier'},
        messages: {
          type: 'array',
          description: 'Array of chat messages',
          items: {type: 'object'}
        }
      },
      required: ['threadId', 'messages']
    }
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Chat stream saved successfully',
    schema: {
      type: 'object',
      properties: {
        success: {type: 'boolean'},
        id: {type: 'string'},
        threadId: {type: 'string'},
        timestamp: {type: 'string'}
      }
    }
  })
  public async saveChatStream(
    @HttpUser() user: HttpUserPayload,
    @Body() body: { threadId: string; messages: Array<{ role: string; content: string; timestamp: string }> }
  ): Promise<{ success: boolean; id: string; threadId: string; timestamp: string }> {

    try {
      const chatStream: ChatStream = await ChatStream.new({
        threadId: body.threadId,
        messages: body.messages
      });

      const saved: ChatStream = await this.chatStreamRepository.save(chatStream);

      return {
        success: true,
        id: saved.getId(),
        threadId: saved.threadId,
        timestamp: saved.ts.toISOString()
      };
    } catch (error) {
      return {
        success: false,
        id: '',
        threadId: body.threadId,
        timestamp: new Date().toISOString()
      };
    }
  }
}