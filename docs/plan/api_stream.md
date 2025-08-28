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

### **阶段 3: Chat 域模型创建**
**目标**: 基于 chat_streams 表结构建立 Chat 域模型
**测试方式**: 单元测试验证域实体和数据持久化
**预计时间**: 1.5天

#### 3.1 基于 chat_streams 表的域模型设计

基于给定的 `chat_streams` 表结构，我们设计一个简化的域模型：

```sql
CREATE TABLE IF NOT EXISTS chat_streams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id VARCHAR(255) NOT NULL UNIQUE,
    messages JSONB NOT NULL,
    ts TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

域模型结构：
```
src/core/domain/chat/
├── di/
│   └── ChatDITokens.ts              # DI token definitions
├── entity/
│   ├── ChatStream.ts                # 聊天流实体
│   ├── ChatMessage.ts               # 消息实体（纯值对象）
│   └── type/
│       ├── CreateChatStreamEntityPayload.ts
│       └── ChatMessageType.ts
├── port/
│   ├── persistence/
│   │   └── ChatStreamRepositoryPort.ts  # 聊天流仓库接口
│   └── usecase/
│       ├── StreamChatPort.ts            # 流式聊天用例接口
│       └── GetChatStreamPort.ts         # 获取聊天流用例接口
├── usecase/
│   ├── StreamChatUseCase.ts         # 流式聊天用例
│   ├── GetChatStreamUseCase.ts      # 获取聊天流用例
│   └── dto/
│       └── ChatStreamUseCaseDto.ts      # 聊天流DTO
└── value-object/
    ├── ThreadId.ts                  # 线程ID值对象
    └── type/
        └── CreateThreadIdValueObjectPayload.ts
```

#### 3.2 核心实体设计

**ChatStream 实体** (`src/core/domain/chat/entity/ChatStream.ts`):
```typescript
import { Entity } from '@core/common/entity/Entity';
import { ChatMessage } from './ChatMessage';
import { ThreadId } from '../value-object/ThreadId';
import { ClassValidator } from '@core/common/util/ClassValidator';
import { IsNotEmpty, IsArray, IsUUID } from 'class-validator';

export interface CreateChatStreamEntityPayload {
  id?: string;
  threadId: string;
  messages: ChatMessage[];
  timestamp?: Date;
}

export class ChatStream extends Entity<string> {
  @IsUUID()
  private _id: string;

  @IsNotEmpty()
  private _threadId: ThreadId;

  @IsArray()
  private _messages: ChatMessage[];

  private _timestamp: Date;

  constructor(payload: CreateChatStreamEntityPayload) {
    super(payload.id || crypto.randomUUID());
    this._id = this.getId();
    this._threadId = ThreadId.new({ value: payload.threadId });
    this._messages = payload.messages || [];
    this._timestamp = payload.timestamp || new Date();
  }

  public static async new(payload: CreateChatStreamEntityPayload): Promise<ChatStream> {
    const stream = new ChatStream(payload);
    await stream.validate();
    return stream;
  }

  // 业务方法
  public addMessage(message: ChatMessage): void {
    this._messages.push(message);
    this._timestamp = new Date();
  }

  public updateMessages(messages: ChatMessage[]): void {
    this._messages = messages;
    this._timestamp = new Date();
  }

  public getMessagesByRole(role: string): ChatMessage[] {
    return this._messages.filter(msg => msg.role === role);
  }

  public getLastMessage(): ChatMessage | undefined {
    return this._messages[this._messages.length - 1];
  }

  // Getters
  get threadId(): ThreadId { return this._threadId; }
  get messages(): ChatMessage[] { return [...this._messages]; }
  get timestamp(): Date { return this._timestamp; }
  get messageCount(): number { return this._messages.length; }

  public async validate(): Promise<void> {
    const validator = await ClassValidator.new();
    await validator.validate(this);
  }

  // 序列化为 JSONB 格式
  public serializeMessages(): any {
    return this._messages.map(msg => ({
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp,
      metadata: msg.metadata
    }));
  }

  // 从 JSONB 数据恢复
  public static deserializeMessages(jsonData: any[]): ChatMessage[] {
    return jsonData.map(data => ChatMessage.new({
      role: data.role,
      content: data.content,
      timestamp: new Date(data.timestamp),
      metadata: data.metadata || {}
    }));
  }
}
```

**ChatMessage 实体**（简化版） (`src/core/domain/chat/entity/ChatMessage.ts`):
```typescript
export interface CreateChatMessageEntityPayload {
  role: MessageRole;
  content: string;
  timestamp?: Date;
  metadata?: Record<string, any>;
}

export class ChatMessage {
  public readonly role: MessageRole;
  public readonly content: string;
  public readonly timestamp: Date;
  public readonly metadata: Record<string, any>;

  constructor(payload: CreateChatMessageEntityPayload) {
    this.role = payload.role;
    this.content = payload.content;
    this.timestamp = payload.timestamp || new Date();
    this.metadata = payload.metadata || {};
  }

  public static new(payload: CreateChatMessageEntityPayload): ChatMessage {
    return new ChatMessage(payload);
  }

  public isFromUser(): boolean {
    return this.role === MessageRole.USER;
  }

  public isFromAssistant(): boolean {
    return this.role === MessageRole.ASSISTANT;
  }

  public hasMetadata(key: string): boolean {
    return key in this.metadata;
  }
}

export enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system',
  TOOL = 'tool',
}
```

#### 3.3 ThreadId 值对象
**ThreadId** (`src/core/domain/chat/value-object/ThreadId.ts`):
```typescript
import { ValueObject } from '@core/common/value-object/ValueObject';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ClassValidator } from '@core/common/util/ClassValidator';

export interface CreateThreadIdValueObjectPayload {
  value: string;
}

export class ThreadId extends ValueObject {
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  private readonly _value: string;

  constructor(payload: CreateThreadIdValueObjectPayload) {
    super();
    this._value = payload.value;
  }

  public static new(payload: CreateThreadIdValueObjectPayload): ThreadId {
    const threadId = new ThreadId(payload);
    threadId.validate();
    return threadId;
  }

  public static generate(): ThreadId {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return ThreadId.new({ value: `thread_${timestamp}_${random}` });
  }

  get value(): string {
    return this._value;
  }

  public equals(other: ThreadId): boolean {
    return this._value === other._value;
  }

  public toString(): string {
    return this._value;
  }

  private validate(): void {
    const validator = ClassValidator.new();
    validator.validate(this);
  }
}
```

#### 3.4 Repository 接口设计
**ChatStreamRepositoryPort** (`src/core/domain/chat/port/persistence/ChatStreamRepositoryPort.ts`):
```typescript
import { ChatStream } from '../../entity/ChatStream';
import { ThreadId } from '../../value-object/ThreadId';

export interface ChatStreamRepositoryPort {
  save(stream: ChatStream): Promise<ChatStream>;
  findByThreadId(threadId: ThreadId): Promise<ChatStream | null>;
  findByThreadIdString(threadId: string): Promise<ChatStream | null>;
  exists(threadId: ThreadId): Promise<boolean>;
  remove(stream: ChatStream): Promise<void>;
  findRecentStreams(limit?: number): Promise<ChatStream[]>;
}
```

#### 3.5 数据库迁移
使用给定的表结构，无需额外创建迁移。表已经存在且包含所需的所有字段。

**测试验证**:
```bash
# 运行单元测试
npm test -- src/test/unit/core/domain/chat/entity/ChatStream.spec.ts
npm test -- src/test/unit/core/domain/chat/value-object/ThreadId.spec.ts

# 验证域模型创建
npm run build
```

---

### **阶段 4: LangChain 基础集成**
**目标**: 集成 LangChain，实现基本的 LLM 调用和流式输出
**测试方式**: 测试基本的 AI 对话功能，验证流式响应
**预计时间**: 1.5天

#### 4.1 LLM 适配器实现
创建 `@infrastructure/adapter/llm/LangChainAdapter.ts`:
```typescript
import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { BaseMessage, HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
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

#### 5.2 TypeORM ChatStream 实体定义
创建 `src/infrastructure/adapter/persistence/typeorm/entity/chat/TypeOrmChatStream.ts`:
```typescript
import { Column, Entity, PrimaryGeneratedColumn, Index } from 'typeorm';

@Entity('chat_streams')
export class TypeOrmChatStream {
  @PrimaryGeneratedColumn('uuid')
  public id: string;

  @Column({ name: 'thread_id', type: 'varchar', length: 255, unique: true })
  @Index()
  public threadId: string;

  @Column({ type: 'jsonb' })
  public messages: any[];

  @Column({ name: 'ts', type: 'timestamp with time zone', default: () => 'NOW()' })
  @Index()
  public ts: Date;
}
```

#### 5.3 Mapper 实现
创建 `src/infrastructure/adapter/persistence/typeorm/entity/chat/mapper/TypeOrmChatStreamMapper.ts`:
```typescript
import { ChatStream } from '@core/domain/chat/entity/ChatStream';
import { ChatMessage } from '@core/domain/chat/entity/ChatMessage';
import { ThreadId } from '@core/domain/chat/value-object/ThreadId';
import { TypeOrmChatStream } from '../TypeOrmChatStream';

export class TypeOrmChatStreamMapper {
  
  public static toTypeOrmEntity(stream: ChatStream): TypeOrmChatStream {
    const typeOrmStream = new TypeOrmChatStream();
    
    if (stream.getId()) {
      typeOrmStream.id = stream.getId();
    }
    
    typeOrmStream.threadId = stream.threadId.value;
    typeOrmStream.messages = stream.serializeMessages();
    typeOrmStream.ts = stream.timestamp;
    
    return typeOrmStream;
  }

  public static toDomainEntity(typeOrmStream: TypeOrmChatStream): ChatStream {
    const messages = ChatStream.deserializeMessages(typeOrmStream.messages);
    
    return new ChatStream({
      id: typeOrmStream.id,
      threadId: typeOrmStream.threadId,
      messages,
      timestamp: typeOrmStream.ts,
    });
  }
}

#### 5.4 Use Case 服务实现
基于新的 ChatStream 架构创建用例服务：

**GetChatStreamService** (`src/core/service/chat/usecase/GetChatStreamService.ts`):
```typescript
@Injectable()
export class GetChatStreamService implements GetChatStreamUseCase {
  constructor(
    @Inject(ChatDITokens.ChatStreamRepository)
    private readonly chatStreamRepository: ChatStreamRepositoryPort,
  ) {}

  public async execute(port: GetChatStreamPort): Promise<ChatStreamUseCaseDto> {
    const threadId = ThreadId.new({ value: port.threadId });
    const stream = await this.chatStreamRepository.findByThreadId(threadId);
    
    if (!stream) {
      throw new Error(`Chat stream not found: ${port.threadId}`);
    }

    return ChatStreamUseCaseDto.new({
      id: stream.getId(),
      threadId: stream.threadId.value,
      messages: stream.messages.map(msg => ChatMessageUseCaseDto.fromEntity(msg)),
      messageCount: stream.messageCount,
      timestamp: stream.timestamp,
    });
  }
}

interface GetChatStreamPort {
  threadId: string;
  executorId: string; // for authorization
}
```

**StreamChatService** (更新版本适配 ChatStream):
```typescript
@Injectable()
export class StreamChatService implements StreamChatUseCase {
  
  constructor(
    @Inject(ChatDITokens.ChatStreamRepository)
    private readonly chatStreamRepository: ChatStreamRepositoryPort,
  ) {}

  public async execute(port: StreamChatPort): Promise<StreamChatResponse> {
    // 1. 获取或创建聊天流
    let stream: ChatStream;
    let threadId: ThreadId;
    
    if (port.threadId) {
      threadId = ThreadId.new({ value: port.threadId });
      stream = await this.chatStreamRepository.findByThreadId(threadId);
      if (!stream) {
        throw new Error(`Chat stream not found: ${port.threadId}`);
      }
    } else {
      // 生成新的 thread ID
      threadId = ThreadId.generate();
      stream = await ChatStream.new({
        threadId: threadId.value,
        messages: [],
      });
    }

    // 2. 创建用户消息
    const userMessage = ChatMessage.new({
      role: MessageRole.USER,
      content: port.message,
      timestamp: new Date(),
      metadata: { executorId: port.executorId }
    });

    // 3. 添加用户消息到流中
    stream.addMessage(userMessage);

    // 4. 创建 LLM 适配器
    const llmAdapter = new LangChainAdapter(port.provider, port.model);
    
    // 5. 转换历史消息为 LangChain 格式
    const langChainMessages = stream.messages.map(msg => 
      LangChainAdapter.convertToLangChainMessage(msg.role, msg.content)
    );

    // 6. 生成 AI 响应流
    const aiMessageId = crypto.randomUUID();
    
    return {
      threadId: threadId.value,
      messageId: aiMessageId,
      content: this.wrapStreamWithPersistence(
        llmAdapter.streamCompletion(langChainMessages),
        stream,
        userMessage
      ),
    };
  }

  private async* wrapStreamWithPersistence(
    aiStream: AsyncIterableIterator<string>,
    chatStream: ChatStream,
    userMessage: ChatMessage
  ): AsyncIterableIterator<string> {
    let aiContent = '';
    let isFirstChunk = true;

    try {
      for await (const chunk of aiStream) {
        aiContent += chunk;
        
        // 第一次保存时包含用户消息
        if (isFirstChunk) {
          await this.chatStreamRepository.save(chatStream);
          isFirstChunk = false;
        }

        yield chunk;
      }

      // 流结束后添加AI消息并保存
      const aiMessage = ChatMessage.new({
        role: MessageRole.ASSISTANT,
        content: aiContent,
        timestamp: new Date(),
      });

      chatStream.addMessage(aiMessage);
      await this.chatStreamRepository.save(chatStream);

    } catch (error) {
      // 错误处理
      if (aiContent) {
        const errorMessage = ChatMessage.new({
          role: MessageRole.ASSISTANT,
          content: aiContent + '\n[Error occurred during generation]',
          timestamp: new Date(),
          metadata: { error: error.message }
        });
        chatStream.addMessage(errorMessage);
        await this.chatStreamRepository.save(chatStream);
      }
      throw error;
    }
  }
}
```

#### 5.5 REST API 端点更新
更新 `ChatController.ts` 以支持新的 ChatStream 架构:
```typescript
// 更新现有的 stream 端点支持 threadId
@Post('stream')
@HttpAuth(UserRole.AUTHOR, UserRole.ADMIN, UserRole.GUEST)
@HttpCode(HttpStatus.OK)
@ApiBearerAuth()
@ApiBody({ 
  schema: {
    type: 'object',
    properties: {
      message: { type: 'string' },
      threadId: { type: 'string', required: false },
      provider: { type: 'string', required: false },
      model: { type: 'string', required: false }
    }
  }
})
@ApiResponse({status: HttpStatus.OK, description: 'Server-Sent Events stream'})
public async streamChat(
  @HttpUser() user: HttpUserPayload,
  @Body() body: StreamChatRequestBody,
  @Res() response: Response
): Promise<void> {
  // SSE 响应头设置
  response.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  try {
    const adapter = await StreamChatAdapter.new({
      executorId: user.id,
      message: body.message,
      threadId: body.threadId, // 可选的 threadId
      provider: body.provider,
      model: body.model,
    });

    const streamResponse = await this.streamChatUseCase.execute(adapter);
    
    // 发送开始事件
    response.write(SSEAdapter.formatSSEEvent('stream_start', {
      threadId: streamResponse.threadId,
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

// 新增获取聊天流历史的端点
@Get('thread/:threadId')
@HttpAuth(UserRole.AUTHOR, UserRole.ADMIN, UserRole.GUEST)
@HttpCode(HttpStatus.OK)
@ApiBearerAuth()
@ApiResponse({ status: HttpStatus.OK, type: Object })
public async getChatStreamHistory(
  @HttpUser() user: HttpUserPayload,
  @Param('threadId') threadId: string,
): Promise<CoreApiResponse<ChatStreamUseCaseDto>> {
  const adapter = await GetChatStreamAdapter.new({
    executorId: user.id,
    threadId,
  });

  const stream = await this.getChatStreamUseCase.execute(adapter);
  return CoreApiResponse.success(stream);
}

// 获取最近的聊天流列表
@Get('recent')
@HttpAuth(UserRole.AUTHOR, UserRole.ADMIN)
@HttpCode(HttpStatus.OK)
@ApiBearerAuth()
@ApiResponse({ status: HttpStatus.OK, type: Array })
public async getRecentChatStreams(
  @HttpUser() user: HttpUserPayload,
  @Query() query: { limit?: number }
): Promise<CoreApiResponse<ChatStreamUseCaseDto[]>> {
  // 注意：这里可以根据需要添加用户过滤逻辑
  const streams = await this.chatStreamRepository.findRecentStreams(
    query.limit || 20
  );

  const dtos = streams.map(stream => ChatStreamUseCaseDto.new({
    id: stream.getId(),
    threadId: stream.threadId.value,
    messages: stream.messages.map(msg => ChatMessageUseCaseDto.fromEntity(msg)),
    messageCount: stream.messageCount,
    timestamp: stream.timestamp,
  }));

  return CoreApiResponse.success(dtos);
}

interface StreamChatRequestBody {
  message: string;
  threadId?: string;
  provider?: string;
  model?: string;
}
```

**测试验证**:
```bash
# 测试新聊天流创建（不提供threadId会自动生成新的）
curl -N -H "Accept: text/event-stream" -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -X POST http://localhost:3005/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello, how are you?"}'

# 测试继续已有聊天流（提供threadId继续对话）
curl -N -H "Accept: text/event-stream" -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -X POST http://localhost:3005/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"message":"Tell me more", "threadId":"thread_abc123_xyz789"}'

# 测试获取聊天流历史
curl -X GET "http://localhost:3005/api/chat/thread/thread_abc123_xyz789" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 测试获取最近的聊天流列表  
curl -X GET "http://localhost:3005/api/chat/recent?limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### **阶段 6: 工具调用支持（Function Calling）**
**目标**: 实现 LLM 工具调用功能
**测试方式**: 测试简单工具调用（如获取天气、计算器等）
**预计时间**: 2天

#### 6.1 工具系统基础架构
创建工具系统目录结构：
```
src/core/domain/chat/tool/
├── interface/
│   └── ChatTool.ts                  # 工具接口定义
├── registry/
│   └── ToolRegistry.ts              # 工具注册中心
├── builtin/
│   ├── CalculatorTool.ts            # 内置计算器工具
│   ├── WeatherTool.ts               # 内置天气查询工具
│   └── SearchTool.ts                # 内置搜索工具
└── types/
    ├── ToolCall.ts                  # 工具调用类型
    ├── ToolResult.ts                # 工具结果类型
    └── ToolDefinition.ts            # 工具定义类型
```

**ChatTool 接口** (`src/core/domain/chat/tool/interface/ChatTool.ts`):
```typescript
export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  required: boolean;
  enum?: string[];
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: ToolParameter[];
}

export interface ToolCall {
  id: string;
  name: string;
  parameters: Record<string, any>;
  timestamp: Date;
}

export interface ToolResult {
  toolCallId: string;
  success: boolean;
  result: any;
  error?: string;
  executionTime: number;
  timestamp: Date;
}

export abstract class ChatTool {
  abstract getName(): string;
  abstract getDescription(): string;
  abstract getDefinition(): ToolDefinition;
  abstract execute(parameters: Record<string, any>): Promise<ToolResult>;

  protected validateParameters(parameters: Record<string, any>): void {
    const definition = this.getDefinition();
    
    // 验证必需参数
    for (const param of definition.parameters) {
      if (param.required && !(param.name in parameters)) {
        throw new Error(`Missing required parameter: ${param.name}`);
      }
    }

    // 验证参数类型
    for (const [key, value] of Object.entries(parameters)) {
      const param = definition.parameters.find(p => p.name === key);
      if (param && !this.isValidType(value, param.type)) {
        throw new Error(`Invalid type for parameter ${key}: expected ${param.type}`);
      }
    }
  }

  private isValidType(value: any, expectedType: string): boolean {
    switch (expectedType) {
      case 'string': return typeof value === 'string';
      case 'number': return typeof value === 'number';
      case 'boolean': return typeof value === 'boolean';
      case 'object': return typeof value === 'object' && value !== null;
      case 'array': return Array.isArray(value);
      default: return true;
    }
  }
}
```

#### 6.2 基础工具实现

**计算器工具** (`src/core/domain/chat/tool/builtin/CalculatorTool.ts`):
```typescript
import { ChatTool, ToolDefinition, ToolResult } from '../interface/ChatTool';
import { Injectable } from '@nestjs/common';

@Injectable()
export class CalculatorTool extends ChatTool {
  public getName(): string {
    return 'calculator';
  }

  public getDescription(): string {
    return 'Perform mathematical calculations. Supports basic arithmetic operations.';
  }

  public getDefinition(): ToolDefinition {
    return {
      name: this.getName(),
      description: this.getDescription(),
      parameters: [
        {
          name: 'expression',
          type: 'string',
          description: 'Mathematical expression to evaluate (e.g., "2 + 2", "sin(3.14159/2)")',
          required: true,
        }
      ],
    };
  }

  public async execute(parameters: Record<string, any>): Promise<ToolResult> {
    const startTime = Date.now();
    
    try {
      this.validateParameters(parameters);
      
      const expression = parameters.expression;
      const result = this.evaluateExpression(expression);
      
      return {
        toolCallId: parameters.toolCallId || 'unknown',
        success: true,
        result: {
          expression,
          result,
          type: 'number'
        },
        executionTime: Date.now() - startTime,
        timestamp: new Date(),
      };

    } catch (error) {
      return {
        toolCallId: parameters.toolCallId || 'unknown',
        success: false,
        result: null,
        error: error.message,
        executionTime: Date.now() - startTime,
        timestamp: new Date(),
      };
    }
  }

  private evaluateExpression(expression: string): number {
    // 简单且安全的数学表达式解析
    // 在生产环境中应该使用更安全的数学解析库
    const sanitized = expression.replace(/[^0-9+\-*/.() ]/g, '');
    
    try {
      // 使用 Function 构造器而不是 eval 来提高安全性
      const result = new Function('return ' + sanitized)();
      
      if (typeof result !== 'number' || !isFinite(result)) {
        throw new Error('Result is not a valid number');
      }
      
      return result;
    } catch (error) {
      throw new Error(`Invalid mathematical expression: ${expression}`);
    }
  }
}
```

**天气查询工具** (`src/core/domain/chat/tool/builtin/WeatherTool.ts`):
```typescript
import { ChatTool, ToolDefinition, ToolResult } from '../interface/ChatTool';
import { Injectable } from '@nestjs/common';

@Injectable()
export class WeatherTool extends ChatTool {
  // OpenWeatherMap API Key (应该从环境变量获取)
  private readonly apiKey = process.env.OPENWEATHER_API_KEY;

  public getName(): string {
    return 'get_weather';
  }

  public getDescription(): string {
    return 'Get current weather information for a specific location';
  }

  public getDefinition(): ToolDefinition {
    return {
      name: this.getName(),
      description: this.getDescription(),
      parameters: [
        {
          name: 'location',
          type: 'string',
          description: 'City name or "latitude,longitude" coordinates',
          required: true,
        },
        {
          name: 'units',
          type: 'string',
          description: 'Temperature units',
          required: false,
          enum: ['metric', 'imperial', 'kelvin']
        }
      ],
    };
  }

  public async execute(parameters: Record<string, any>): Promise<ToolResult> {
    const startTime = Date.now();
    
    try {
      this.validateParameters(parameters);
      
      if (!this.apiKey) {
        throw new Error('Weather API key not configured');
      }

      const { location, units = 'metric' } = parameters;
      const weatherData = await this.fetchWeatherData(location, units);
      
      return {
        toolCallId: parameters.toolCallId || 'unknown',
        success: true,
        result: {
          location: weatherData.name,
          country: weatherData.sys.country,
          temperature: weatherData.main.temp,
          feelsLike: weatherData.main.feels_like,
          humidity: weatherData.main.humidity,
          description: weatherData.weather[0].description,
          windSpeed: weatherData.wind?.speed,
          units: units
        },
        executionTime: Date.now() - startTime,
        timestamp: new Date(),
      };

    } catch (error) {
      return {
        toolCallId: parameters.toolCallId || 'unknown',
        success: false,
        result: null,
        error: error.message,
        executionTime: Date.now() - startTime,
        timestamp: new Date(),
      };
    }
  }

  private async fetchWeatherData(location: string, units: string): Promise<any> {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(location)}&appid=${this.apiKey}&units=${units}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Weather API error: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  }
}
```

#### 6.3 工具注册中心
创建 `src/core/domain/chat/tool/registry/ToolRegistry.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { ChatTool, ToolCall, ToolResult } from '../interface/ChatTool';

@Injectable()
export class ToolRegistry {
  private tools: Map<string, ChatTool> = new Map();

  public registerTool(tool: ChatTool): void {
    this.tools.set(tool.getName(), tool);
  }

  public getTool(name: string): ChatTool | undefined {
    return this.tools.get(name);
  }

  public getAllTools(): ChatTool[] {
    return Array.from(this.tools.values());
  }

  public getToolDefinitions(): any[] {
    return this.getAllTools().map(tool => tool.getDefinition());
  }

  public async executeTool(toolCall: ToolCall): Promise<ToolResult> {
    const tool = this.getTool(toolCall.name);
    
    if (!tool) {
      return {
        toolCallId: toolCall.id,
        success: false,
        result: null,
        error: `Unknown tool: ${toolCall.name}`,
        executionTime: 0,
        timestamp: new Date(),
      };
    }

    return tool.execute({ 
      ...toolCall.parameters, 
      toolCallId: toolCall.id 
    });
  }
}
```

#### 6.4 LangChain 工具调用集成
更新 `LangChainAdapter.ts` 以支持工具调用：
```typescript
import { ChatOpenAI } from '@langchain/openai';
import { DynamicTool } from '@langchain/core/tools';
import { AgentExecutor, createOpenAIFunctionsAgent } from 'langchain/agents';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { ToolRegistry } from '@core/domain/chat/tool/registry/ToolRegistry';

export class LangChainAdapter implements LLMProvider {
  // ... 现有代码

  constructor(
    provider?: string, 
    model?: string,
    private toolRegistry?: ToolRegistry
  ) {
    // ... 现有构造器代码
  }

  public async* streamCompletionWithTools(
    messages: BaseMessage[],
    enableTools: boolean = true
  ): AsyncIterableIterator<{ type: 'message' | 'tool_call' | 'tool_result', content: any }> {
    
    if (!enableTools || !this.toolRegistry) {
      // 没有工具时，使用原有的流式处理
      for await (const chunk of this.streamCompletion(messages)) {
        yield { type: 'message', content: chunk };
      }
      return;
    }

    // 转换工具定义为 LangChain 格式
    const tools = this.createLangChainTools();
    
    // 创建带工具的代理
    const prompt = ChatPromptTemplate.fromMessages([
      ["system", "You are a helpful assistant with access to tools. Use tools when appropriate to help answer questions."],
      ["placeholder", "{chat_history}"],
      ["human", "{input}"],
      ["placeholder", "{agent_scratchpad}"],
    ]);

    const agent = await createOpenAIFunctionsAgent({
      llm: this.llm as ChatOpenAI,
      tools,
      prompt,
    });

    const agentExecutor = new AgentExecutor({
      agent,
      tools,
      verbose: true,
    });

    // 执行代理并流式返回结果
    const lastMessage = messages[messages.length - 1];
    const result = await agentExecutor.invoke({
      input: lastMessage.content,
      chat_history: messages.slice(0, -1),
    });

    // 解析结果并生成相应的流式事件
    if (result.intermediateSteps) {
      for (const step of result.intermediateSteps) {
        yield {
          type: 'tool_call',
          content: {
            name: step.action.tool,
            parameters: step.action.toolInput,
            id: Date.now().toString(),
          }
        };
        
        yield {
          type: 'tool_result',
          content: {
            toolCallId: Date.now().toString(),
            result: step.observation,
            success: true,
          }
        };
      }
    }

    // 最终的文本响应
    yield { type: 'message', content: result.output };
  }

  private createLangChainTools(): DynamicTool[] {
    const chatTools = this.toolRegistry.getAllTools();
    
    return chatTools.map(chatTool => {
      const definition = chatTool.getDefinition();
      
      return new DynamicTool({
        name: definition.name,
        description: definition.description,
        func: async (input: string) => {
          try {
            const parameters = JSON.parse(input);
            const result = await chatTool.execute(parameters);
            return result.success ? JSON.stringify(result.result) : result.error;
          } catch (error) {
            return `Error: ${error.message}`;
          }
        },
      });
    });
  }
}
```

#### 6.5 工具调用流式处理
更新 `StreamChatService.ts` 以支持工具调用：
```typescript
@Injectable()
export class StreamChatService implements StreamChatUseCase {
  
  constructor(
    @Inject(ChatDITokens.ChatRepository)
    private readonly chatRepository: ChatRepositoryPort,
    
    @Inject(ChatDITokens.ToolRegistry)
    private readonly toolRegistry: ToolRegistry,
  ) {}

  public async* execute(port: StreamChatPort): Promise<AsyncIterableIterator<StreamChatEvent>> {
    // ... 现有代码 ...

    // 创建支持工具的LLM适配器
    const llmAdapter = new LangChainAdapter(
      port.provider, 
      port.model, 
      this.toolRegistry
    );

    // 流式处理工具调用和消息
    for await (const event of llmAdapter.streamCompletionWithTools(langChainMessages, port.enableTools)) {
      switch (event.type) {
        case 'message':
          yield {
            type: 'message_chunk',
            data: {
              content: event.content,
              timestamp: new Date().toISOString(),
            }
          };
          break;
          
        case 'tool_call':
          yield {
            type: 'tool_calls',
            data: {
              toolCalls: [event.content],
              timestamp: new Date().toISOString(),
            }
          };
          break;
          
        case 'tool_result':
          yield {
            type: 'tool_call_result',
            data: {
              ...event.content,
              timestamp: new Date().toISOString(),
            }
          };
          break;
      }
    }
  }
}

export interface StreamChatEvent {
  type: 'message_chunk' | 'tool_calls' | 'tool_call_result' | 'error' | 'done';
  data: any;
}
```

**测试验证**:
```bash
# 测试计算器工具调用
curl -N -H "Accept: text/event-stream" -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -X POST http://localhost:3005/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What is 15 * 23 + 47?",
    "enableTools": true
  }'

# 测试天气查询工具
curl -N -H "Accept: text/event-stream" -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -X POST http://localhost:3005/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What is the weather like in Tokyo?",
    "enableTools": true
  }'

# 预期输出包含工具调用和结果事件
```

---

## 后续阶段概览（阶段 7-12）

### **阶段 7: 高级 SSE 事件处理** (1天)
- 完善所有 SSE 事件类型的处理
- 添加元数据和上下文传递
- 优化事件序列化和错误处理

### **阶段 8: 多轮对话和上下文管理** (1.5天)
- 实现智能上下文窗口管理
- 添加对话历史压缩和相关性评分
- 优化长对话的性能

### **阶段 9: 文件上传和多模态支持** (2天)
- 扩展现有 Media 功能支持聊天
- 集成多模态 LLM（GPT-4V, Claude Vision）
- 实现文件分析和处理

### **阶段 10: 高级配置和自定义** (1天)
- 添加模型参数配置系统
- 实现用户个性化设置
- 创建对话模板和预设

### **阶段 11: 错误处理和监控** (1天)
- 完善错误处理机制
- 添加详细日志和监控
- 实现故障恢复和重试机制

### **阶段 12: 性能优化和生产准备** (1天)
- 系统性能调优
- 压力测试和稳定性验证
- 部署配置和文档完善

---

## 总结

本计划详细分解了 `/api/chat/stream` 接口的完整实施过程，遵循了当前项目的 Clean Architecture 原则，包含：

✅ **12个递进式开发阶段**，每个阶段都有明确的目标和测试验证方法
✅ **完整的技术架构设计**，充分利用现有的基础设施
✅ **详细的代码示例**，展示关键实现细节
✅ **全面的测试策略**，确保每个功能的正确性
✅ **生产级别的质量标准**，包含错误处理、监控和优化

预计总开发时间：**2-3周**，可以并行开发某些独立模块以加速进度。每个阶段完成后都能独立测试和验证，确保项目的稳定推进。