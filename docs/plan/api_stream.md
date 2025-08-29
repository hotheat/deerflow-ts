# /api/chat/stream 流式聊天接口实施计划

## 项目概述
在当前 Clean Architecture TypeScript 项目中实现类似 DeerFlow 的 /api/chat/stream 流式聊天接口，该接口支持实时 AI 聊天、工具调用、多代理协作等高级功能。

## 原始接口分析总结

基于 `/Users/jiaoguo/SynologyDrive/code/github/deer-flow/claude_chats/chat_stream_api.txt` 的分析，原始 DeerFlow 接口具备以下核心特性：

### 核心功能特性
1. **多代理研究工作流**: 支持复杂的多步骤研究和分析
2. **实时流式输出**: 使用 SSE 协议实时返回生成内容
3. **工具调用支持**: 集成外部工具和 API 调用
4. **检查点恢复**: 支持会话状态持久化和恢复
5. **MCP 集成**: 外部服务和工具的统一接入
6. **中断机制**: 支持用户交互和流程调整

### 技术实现要点
- **流式处理**: LangChain + Node.js Streams/Async Iterators 异步流处理
- **事件类型**: message_chunk, tool_calls, tool_call_result, interrupt
- **状态管理**: 工作流输入/输出状态追踪
- **SSE 格式**: 标准 Server-Sent Events 协议

## 技术架构设计

### 核心技术栈
- **SSE (Server-Sent Events)**: 实现流式响应
- **LangChain**: 大模型集成和链式处理
- **CQRS**: 查询和命令分离（现有架构）
- **TypeORM**: 数据持久化（现有架构），配合连接池管理
- **NestJS**: HTTP 框架（现有架构），集成流控制中间件
- **Redis**: 会话状态缓存
- **Bull Queue**: 异步任务处理（可选，推荐）

### Clean Architecture 映射
- **Domain Layer**: Chat 域模型、消息实体、会话管理
- **Service Layer**: 聊天服务、流处理服务、工具调用服务
- **Infrastructure Layer**: LangChain 适配器、SSE 适配器、外部 API 集成
- **Application Layer**: ChatController、流式响应处理

---

## 详细任务分解（共 12 个阶段）

### **阶段 1: 基础架构准备**
**目标**: 建立项目基础依赖和配置
**测试方式**: 验证依赖安装和基本配置
**预计时间**: 0.5天

#### 1.1 安装核心依赖
```bash
npm install langchain @langchain/core @langchain/openai @langchain/anthropic
npm install --save-dev @types/eventsource
```

**依赖包清单**:
- `langchain`: 核心 LangChain 框架
- `@langchain/core`: LangChain 核心组件
- `@langchain/openai`: OpenAI 集成
- `@langchain/anthropic`: Anthropic Claude 集成
- `@langchain/community`: 社区工具集成

#### 1.2 环境变量配置
在 `env/` 目录添加 LLM 相关配置：
```env
# LLM Configuration
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
DEFAULT_LLM_PROVIDER=openai
DEFAULT_MODEL=gpt-4-turbo-preview
MAX_TOKENS=4000
TEMPERATURE=0.7

# Streaming Configuration
STREAM_CHUNK_SIZE=1024
STREAM_TIMEOUT=30000
MAX_CONCURRENT_STREAMS=10
```

#### 1.3 基础配置类
创建 `@infrastructure/config/LLMConfig.ts`:
```typescript
export class LLMConfig {
  public static readonly OPENAI_API_KEY: string = env.get('OPENAI_API_KEY').asString();
  public static readonly ANTHROPIC_API_KEY: string = env.get('ANTHROPIC_API_KEY').asString();
  public static readonly DEFAULT_PROVIDER: string = env.get('DEFAULT_LLM_PROVIDER').default('openai').asString();
  public static readonly DEFAULT_MODEL: string = env.get('DEFAULT_MODEL').default('gpt-4-turbo-preview').asString();
  // ...
}
```

**测试验证**:
```bash
# 验证环境配置
npm run build
npm run start:local
curl http://localhost:3005/health # 确保服务正常启动
```

---

### **阶段 2: 基础 SSE 支持**
**目标**: 实现基本的 Server-Sent Events 流式响应
**测试方式**: curl 测试 SSE 连接和基本字符串流输出
**预计时间**: 0.5天

#### 2.1 SSE 基础设施
创建 `@infrastructure/adapter/streaming/SSEAdapter.ts`:
```typescript
export class SSEAdapter {
  public static formatSSEEvent(eventType: string, data: any): string {
    try {
      const jsonData = JSON.stringify(data, null, 0);
      return `event: ${eventType}\ndata: ${jsonData}\n\n`;
    } catch (error) {
      return SSEAdapter.formatSSEEvent('error', {
        message: 'Failed to serialize data',
        error: error.message
      });
    }
  }

  public static formatSSEChunk(content: string): string {
    return SSEAdapter.formatSSEEvent('message_chunk', {
      content,
      timestamp: new Date().toISOString()
    });
  }

  public static formatSSEComplete(): string {
    return SSEAdapter.formatSSEEvent('done', {
      timestamp: new Date().toISOString()
    });
  }

  public static formatSSEError(error: string): string {
    return SSEAdapter.formatSSEEvent('error', {
      message: error,
      timestamp: new Date().toISOString()
    });
  }
}
```

#### 2.2 基础 Controller 实现
创建 `src/application/api/http-rest/controller/ChatController.ts`:
```typescript
import { Controller, Post, Body, Res, HttpCode, HttpStatus, Inject, StreamableFile } from '@nestjs/common';
import { ApiTags, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { Response } from 'express';
import { Readable } from 'stream';
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
  @ApiBody({ type: 'object' }) // 临时类型，后续会创建具体的DTO
  @ApiResponse({status: HttpStatus.OK, description: 'Server-Sent Events stream'})
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
      const testMessage = `Hello ${user.email}, you said: ${body.message}`;
      
      // 模拟逐字符输出
      for (let i = 0; i < testMessage.length; i++) {
        const char = testMessage[i];
        const chunk = SSEAdapter.formatSSEChunk(char);
        response.write(chunk);
        
        // 模拟延迟
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // 发送完成事件
      response.write(SSEAdapter.formatSSEComplete());
      
    } catch (error) {
      response.write(SSEAdapter.formatSSEError(error.message));
    } finally {
      response.end();
    }
  }
}
```

#### 2.3 模块配置更新
更新相关模块以包含新的 ChatController：

在 `src/application/di/` 创建 `ChatModule.ts`:
```typescript
import { Module } from '@nestjs/common';
import { ChatController } from '@application/api/http-rest/controller/ChatController';

@Module({
  controllers: [ChatController],
  providers: [],
})
export class ChatModule {}
```

更新主模块导入。

**测试验证**:
```bash
# 启动服务
npm run build && npm run start:local

# 测试SSE连接
curl -N -H "Accept: text/event-stream" -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -X POST http://localhost:3005/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello World"}'

# 预期输出：
# event: message_chunk
# data: {"content":"H","timestamp":"2024-..."}
# 
# event: message_chunk  
# data: {"content":"e","timestamp":"2024-..."}
# ...
# event: done
# data: {"timestamp":"2024-..."}
```

---

### **阶段 3: Chat 域模型创建 - 精简测试版**
**目标**: 实现基础的 chat_streams 表 CRUD 操作和测试 API
**测试方式**: API 测试验证数据持久化功能
**预计时间**: 0.5天

#### 3.1 Prisma Schema 更新

在现有 `schema.prisma` 中添加 chat_streams 模型：
```prisma
model ChatStream {
  id        String   @id @default(cuid()) 
  threadId  String   @unique @map("thread_id")
  messages  Json     @map("messages")  
  ts        DateTime @default(now()) @map("ts")

  @@map("chat_streams")
}
```

#### 3.2 精简域模型设计

基于给定的 `chat_streams` 表结构，设计精简的域模型：

```sql
CREATE TABLE IF NOT EXISTS chat_streams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id VARCHAR(255) NOT NULL UNIQUE,
    messages JSONB NOT NULL,
    ts TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

精简域模型结构：
```
src/core/domain/chat/
├── entity/
│   ├── ChatStream.ts              # 简化实体
│   └── type/CreateChatStreamEntityPayload.ts
├── port/
│   └── persistence/ChatStreamRepositoryPort.ts
├── usecase/
│   ├── SaveChatStreamUseCase.ts   # 保存/更新用例
│   └── dto/ChatStreamUseCaseDto.ts
└── di/ChatDITokens.ts
```

#### 3.3 简化实体实现

**ChatStream 实体** (`src/core/domain/chat/entity/ChatStream.ts`):
```typescript
import { Entity } from '@core/common/entity/Entity';
import { IsNotEmpty, IsString, IsArray } from 'class-validator';
import { ClassValidator } from '@core/common/util/ClassValidator';

export interface CreateChatStreamEntityPayload {
  id?: string;
  threadId: string;
  messages: any[];
  ts?: Date;
}

export class ChatStream extends Entity<string> {
  @IsString()
  @IsNotEmpty()
  private readonly _threadId: string;

  @IsArray()
  private _messages: any[];

  private _ts: Date;

  constructor(payload: CreateChatStreamEntityPayload) {
    super(payload.id);
    this._threadId = payload.threadId;
    this._messages = payload.messages || [];
    this._ts = payload.ts || new Date();
  }

  public static async new(payload: CreateChatStreamEntityPayload): Promise<ChatStream> {
    const stream = new ChatStream(payload);
    await stream.validate();
    return stream;
  }

  // 业务方法
  public updateMessages(messages: any[]): void {
    this._messages = messages;
    this._ts = new Date();
  }

  // Getters
  get threadId(): string { return this._threadId; }
  get messages(): any[] { return [...this._messages]; }
  get ts(): Date { return this._ts; }

  public async validate(): Promise<void> {
    const validator = await ClassValidator.new();
    await validator.validate(this);
  }
}
```

#### 3.4 Repository 接口设计

**ChatStreamRepositoryPort** (`src/core/domain/chat/port/persistence/ChatStreamRepositoryPort.ts`):
```typescript
import { ChatStream } from '../entity/ChatStream';

export interface ChatStreamRepositoryPort {
  save(stream: ChatStream): Promise<ChatStream>;
  findByThreadId(threadId: string): Promise<ChatStream | null>;
}
```

#### 3.5 Repository 实现

**ChatStreamRepositoryAdapter** (使用 Prisma，直接实现你的 Python 逻辑):
```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/adapter/persistence/PrismaService';
import { ChatStream } from '@core/domain/chat/entity/ChatStream';
import { ChatStreamRepositoryPort } from '@core/domain/chat/port/persistence/ChatStreamRepositoryPort';

@Injectable()
export class ChatStreamRepositoryAdapter implements ChatStreamRepositoryPort {
  
  constructor(private readonly prismaService: PrismaService) {}

  public async save(stream: ChatStream): Promise<ChatStream> {
    const client = this.prismaService.getClient();
    
    // 检查是否存在 (对应 Python: cursor.execute("SELECT id FROM chat_streams WHERE thread_id = %s"))
    const existing = await client.chatStream.findUnique({
      where: { threadId: stream.threadId }
    });

    if (existing) {
      // 更新已存在的记录 (对应 Python: UPDATE chat_streams SET messages = %s, ts = %s)
      const updated = await client.chatStream.update({
        where: { threadId: stream.threadId },
        data: {
          messages: stream.messages,
          ts: new Date()
        }
      });
      
      return ChatStream.new({
        id: updated.id,
        threadId: updated.threadId,
        messages: updated.messages as any[],
        ts: updated.ts
      });
    } else {
      // 创建新记录 (对应 Python: INSERT INTO chat_streams)
      const created = await client.chatStream.create({
        data: {
          threadId: stream.threadId,
          messages: stream.messages,
          ts: new Date()
        }
      });
      
      return ChatStream.new({
        id: created.id,
        threadId: created.threadId,
        messages: created.messages as any[],
        ts: created.ts
      });
    }
  }

  public async findByThreadId(threadId: string): Promise<ChatStream | null> {
    const client = this.prismaService.getClient();
    const found = await client.chatStream.findUnique({
      where: { threadId }
    });

    if (!found) return null;

    return ChatStream.new({
      id: found.id,
      threadId: found.threadId,
      messages: found.messages as any[],
      ts: found.ts
    });
  }
}
```

#### 3.6 单一 API 端点实现

**ChatController.ts** 中添加 POST `/api/chat/streams` 端点:
```typescript
@Post('streams')
@HttpAuth(UserRole.AUTHOR, UserRole.ADMIN, UserRole.GUEST) 
@HttpCode(HttpStatus.OK)
@ApiBearerAuth()
@ApiBody({
  schema: {
    type: 'object',
    properties: {
      threadId: { type: 'string' },
      messages: { type: 'array' }
    },
    required: ['threadId', 'messages']
  }
})
@ApiResponse({ 
  status: HttpStatus.OK, 
  description: 'Chat stream saved successfully',
  schema: {
    properties: {
      success: { type: 'boolean' },
      id: { type: 'string' },
      threadId: { type: 'string' },
      timestamp: { type: 'string' }
    }
  }
})
public async saveChatStream(
  @HttpUser() user: HttpUserPayload,
  @Body() body: { threadId: string; messages: any[] }
): Promise<{ success: boolean; id: string; threadId: string; timestamp: string }> {
  
  try {
    const chatStream = await ChatStream.new({
      threadId: body.threadId,
      messages: body.messages
    });

    const saved = await this.chatStreamRepository.save(chatStream);

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
```

#### 3.7 测试验证

```bash
# 创建新聊天流
curl -X POST http://localhost:3005/api/chat/streams \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"threadId":"test-thread-1","messages":[{"role":"user","content":"Hello"}]}'

# 更新已存在的聊天流  
curl -X POST http://localhost:3005/api/chat/streams \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"threadId":"test-thread-1","messages":[{"role":"user","content":"Hello"},{"role":"assistant","content":"Hi!"}]}'

# 预期输出：
# {"success":true,"id":"cuid...","threadId":"test-thread-1","timestamp":"2024-..."}
```


import { LLMConfig } from '@infrastructure/config/LLMConfig';

export interface LLMProvider {
  streamCompletion(messages: BaseMessage[]): AsyncIterableIterator<string>;
  getCompletion(messages: BaseMessage[]): Promise<string>;
}

export class LangChainAdapter implements LLMProvider {
  private llm: ChatOpenAI | ChatAnthropic;

  constructor(provider?: string, model?: string) {
    const selectedProvider = provider || LLMConfig.DEFAULT_PROVIDER;
    const selectedModel = model || LLMConfig.DEFAULT_MODEL;

    switch (selectedProvider) {
      case 'openai':
        this.llm = new ChatOpenAI({
          modelName: selectedModel,
          temperature: LLMConfig.TEMPERATURE,
          maxTokens: LLMConfig.MAX_TOKENS,
          streaming: true,
          openAIApiKey: LLMConfig.OPENAI_API_KEY,
        });
        break;
      case 'anthropic':
        this.llm = new ChatAnthropic({
          modelName: selectedModel,
          temperature: LLMConfig.TEMPERATURE,
          maxTokens: LLMConfig.MAX_TOKENS,
          streaming: true,
          anthropicApiKey: LLMConfig.ANTHROPIC_API_KEY,
        });
        break;
      default:
        throw new Error(`Unsupported LLM provider: ${selectedProvider}`);
    }
  }

  public async* streamCompletion(messages: BaseMessage[]): AsyncIterableIterator<string> {
    const stream = await this.llm.stream(messages);
    
    for await (const chunk of stream) {
      if (chunk.content) {
        yield chunk.content as string;
      }
    }
  }

  public async getCompletion(messages: BaseMessage[]): Promise<string> {
    const result = await this.llm.invoke(messages);
    return result.content as string;
  }

  public static convertToLangChainMessage(role: string, content: string): BaseMessage {
    switch (role) {
      case 'user':
        return new HumanMessage(content);
      case 'assistant':
        return new AIMessage(content);
      case 'system':
        return new SystemMessage(content);
      default:
        throw new Error(`Unsupported message role: ${role}`);
    }
  }
}
```

#### 4.2 Chat Service 实现
创建 `src/core/service/chat/usecase/StreamChatService.ts`:
```typescript
import { Inject, Injectable } from '@nestjs/common';
import { StreamChatUseCase } from '@core/domain/chat/usecase/StreamChatUseCase';
import { StreamChatPort } from '@core/domain/chat/port/usecase/StreamChatPort';
import { ChatRepositoryPort } from '@core/domain/chat/port/persistence/ChatRepositoryPort';
import { ChatDITokens } from '@core/domain/chat/di/ChatDITokens';
import { LangChainAdapter, LLMProvider } from '@infrastructure/adapter/llm/LangChainAdapter';
import { Chat } from '@core/domain/chat/entity/Chat';
import { ChatMessage } from '@core/domain/chat/entity/ChatMessage';
import { MessageRole } from '@core/common/enums/ChatEnums';
import { BaseMessage } from '@langchain/core/messages';

export interface StreamChatResponse {
  chatId: string;
  messageId: string;
  content: AsyncIterableIterator<string>;
}

@Injectable()
export class StreamChatService implements StreamChatUseCase {
  
  constructor(
    @Inject(ChatDITokens.ChatRepository)
    private readonly chatRepository: ChatRepositoryPort,
  ) {}

  public async execute(port: StreamChatPort): Promise<StreamChatResponse> {
    // 1. 获取或创建聊天会话
    let chat: Chat;
    if (port.chatId) {
      chat = await this.chatRepository.findById(port.chatId);
      if (!chat) {
        throw new Error(`Chat not found: ${port.chatId}`);
      }
    } else {
      chat = await Chat.new({
        id: generateUuid(),
        title: port.message.substring(0, 50) + '...',
        userId: port.executorId,
        createdAt: new Date(),
      });
      await this.chatRepository.save(chat);
    }

    // 2. 保存用户消息
    const userMessage = await ChatMessage.new({
      id: generateUuid(),
      chatId: chat.getId(),
      role: MessageRole.USER,
      content: port.message,
      timestamp: new Date(),
    });

    // 3. 获取聊天历史
    const chatHistory = await this.chatRepository.getChatMessages(chat.getId());
    
    // 4. 转换为 LangChain 消息格式
    const langChainMessages: BaseMessage[] = chatHistory.map(msg => 
      LangChainAdapter.convertToLangChainMessage(msg.role, msg.content)
    );
    
    // 添加当前用户消息
    langChainMessages.push(
      LangChainAdapter.convertToLangChainMessage(MessageRole.USER, port.message)
    );

    // 5. 创建LLM适配器并生成流式响应
    const llmAdapter = new LangChainAdapter(port.provider, port.model);
    
    // 6. 创建AI消息记录（内容将在流式过程中更新）
    const aiMessage = await ChatMessage.new({
      id: generateUuid(),
      chatId: chat.getId(),
      role: MessageRole.ASSISTANT,
      content: '', // 初始为空，流式过程中累积
      timestamp: new Date(),
    });

    // 7. 返回流式响应
    return {
      chatId: chat.getId(),
      messageId: aiMessage.getId(),
      content: this.wrapStreamWithPersistence(
        llmAdapter.streamCompletion(langChainMessages),
        userMessage,
        aiMessage
      ),
    };
  }

  private async* wrapStreamWithPersistence(
    stream: AsyncIterableIterator<string>,
    userMessage: ChatMessage,
    aiMessage: ChatMessage
  ): AsyncIterableIterator<string> {
    let fullContent = '';
    let isFirstChunk = true;

    try {
      for await (const chunk of stream) {
        fullContent += chunk;
        
        // 第一次接收到内容时保存用户消息
        if (isFirstChunk) {
          await this.chatRepository.saveChatMessage(userMessage);
          isFirstChunk = false;
        }

        yield chunk;
      }

      // 流结束后保存完整的AI消息
      aiMessage.content = fullContent;
      await this.chatRepository.saveChatMessage(aiMessage);

    } catch (error) {
      // 错误处理：保存已接收的部分内容
      if (fullContent) {
        aiMessage.content = fullContent + '\n[Error occurred during generation]';
        await this.chatRepository.saveChatMessage(aiMessage);
      }
      throw error;
    }
  }
}
```

#### 4.3 Controller 集成 LangChain
更新 `ChatController.ts`:
```typescript
@Post('stream')
@HttpAuth(UserRole.AUTHOR, UserRole.ADMIN, UserRole.GUEST)
public async streamChat(
  @HttpUser() user: HttpUserPayload,
  @Body() body: StreamChatRequestBody,
  @Res() response: Response
): Promise<void> {
  response.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  try {
    const adapter: StreamChatAdapter = await StreamChatAdapter.new({
      executorId: user.id,
      message: body.message,
      chatId: body.chatId,
      provider: body.provider,
      model: body.model,
    });

    const streamResponse = await this.streamChatUseCase.execute(adapter);
    
    // 发送开始事件
    response.write(SSEAdapter.formatSSEEvent('stream_start', {
      chatId: streamResponse.chatId,
      messageId: streamResponse.messageId,
    }));

    // 流式输出AI响应
    for await (const chunk of streamResponse.content) {
      response.write(SSEAdapter.formatSSEChunk(chunk));
    }

    // 发送完成事件
    response.write(SSEAdapter.formatSSEComplete());

  } catch (error) {
    response.write(SSEAdapter.formatSSEError(error.message));
  } finally {
    response.end();
  }
}
```

**测试验证**:
```bash
# 测试基础AI对话
curl -N -H "Accept: text/event-stream" -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -X POST http://localhost:3005/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What is the capital of France?",
    "provider": "openai",
    "model": "gpt-4-turbo-preview"
  }'

# 预期输出：逐字符流式返回AI响应
```

---

### **阶段 5: Chat Streams 持久化实现**
**目标**: 实现基于 chat_streams 表的数据持久化功能
**测试方式**: 测试聊天流创建、消息存储、历史查询功能
**预计时间**: 1.5天

#### 5.1 ChatStream Repository 实现
创建 `src/infrastructure/adapter/persistence/typeorm/repository/chat/TypeOrmChatStreamRepositoryAdapter.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatStream } from '@core/domain/chat/entity/ChatStream';
import { ChatStreamRepositoryPort } from '@core/domain/chat/port/persistence/ChatStreamRepositoryPort';
import { ThreadId } from '@core/domain/chat/value-object/ThreadId';
import { TypeOrmChatStream } from '@infrastructure/adapter/persistence/typeorm/entity/chat/TypeOrmChatStream';
import { TypeOrmChatStreamMapper } from '@infrastructure/adapter/persistence/typeorm/entity/chat/mapper/TypeOrmChatStreamMapper';
import { RepositoryOptions } from '@core/common/persistence/RepositoryOptions';

@Injectable()
export class TypeOrmChatStreamRepositoryAdapter implements ChatStreamRepositoryPort {
  
  constructor(
    @InjectRepository(TypeOrmChatStream)
    private readonly chatStreamRepository: Repository<TypeOrmChatStream>,
  ) {}

  public async save(stream: ChatStream): Promise<ChatStream> {
    const typeOrmStream: TypeOrmChatStream = TypeOrmChatStreamMapper.toTypeOrmEntity(stream);
    const savedStream = await this.chatStreamRepository.save(typeOrmStream);
    return TypeOrmChatStreamMapper.toDomainEntity(savedStream);
  }

  public async findByThreadId(threadId: ThreadId): Promise<ChatStream | null> {
    const typeOrmStream = await this.chatStreamRepository.findOne({ 
      where: { threadId: threadId.value } 
    });
    return typeOrmStream ? TypeOrmChatStreamMapper.toDomainEntity(typeOrmStream) : null;
  }

  public async findByThreadIdString(threadId: string): Promise<ChatStream | null> {
    const typeOrmStream = await this.chatStreamRepository.findOne({ 
      where: { threadId } 
    });
    return typeOrmStream ? TypeOrmChatStreamMapper.toDomainEntity(typeOrmStream) : null;
  }

  public async exists(threadId: ThreadId): Promise<boolean> {
    const count = await this.chatStreamRepository.count({
      where: { threadId: threadId.value }
    });
    return count > 0;
  }

  public async remove(stream: ChatStream): Promise<void> {
    await this.chatStreamRepository.delete({ threadId: stream.threadId.value });
  }

  public async findRecentStreams(limit: number = 50): Promise<ChatStream[]> {
    const typeOrmStreams = await this.chatStreamRepository.find({
      order: { ts: 'DESC' },
      take: limit,
    });
    return typeOrmStreams.map(TypeOrmChatStreamMapper.toDomainEntity);
  }
}
```
