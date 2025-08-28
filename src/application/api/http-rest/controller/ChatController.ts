import { Controller, Post, Body, Res, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { Response } from 'express';
import { HttpAuth } from '@application/api/http-rest/auth/decorator/HttpAuth';
import { HttpUser } from '@application/api/http-rest/auth/decorator/HttpUser';
import { HttpUserPayload } from '@application/api/http-rest/auth/type/HttpAuthTypes';
import { UserRole } from '@core/common/enums/UserEnums';
import { SSEAdapter } from '@infrastructure/adapter/streaming/SSEAdapter';

@Controller('chat')
@ApiTags('chat')
export class ChatController {
  
  @Post('stream')
  @HttpAuth(UserRole.AUTHOR, UserRole.ADMIN, UserRole.GUEST)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiBody({ 
    type: 'object',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', description: 'The message to send' }
      },
      required: ['message']
    }
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Server-Sent Events stream',
    headers: {
      'Content-Type': { description: 'text/event-stream' },
      'Cache-Control': { description: 'no-cache' },
      'Connection': { description: 'keep-alive' }
    }
  })
  public async streamChat(
    @HttpUser() user: HttpUserPayload,
    @Body() body: { message: string },
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
      // 测试流式输出
      const testMessage: string = `Hello ${user.email}, you said: ${body.message}`;
      
      // 模拟逐字符输出
      for (let i: number = 0; i < testMessage.length; i++) {
        const char: string = testMessage[i];
        const chunk: string = SSEAdapter.formatSSEChunk(char);
        response.write(chunk);
        
        // 模拟延迟
        await new Promise(resolve => setTimeout(resolve, 50));
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
}