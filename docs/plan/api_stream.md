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
---

### **阶段 4: LangGraph 集成 - 单节点流式聊天**
**目标**: 使用 LangGraph 创建简单的单节点工作流，调用 OpenAI 聊天接口并通过 SSE 流式返回
**测试方式**: 测试 LangGraph 工作流创建、节点执行、流式输出
**预计时间**: 1天

#### 4.1 技术选型和依赖
```bash
npm install @langchain/langgraph
```

**核心技术**:
- **LangGraph**: 构建单节点聊天工作流
- **集成方式**: 作为 Infrastructure 层的工作流适配器
- **流式输出**: 利用 LangGraph 流式执行 + OpenAI streaming

#### 4.2 文件组织结构
```
@infrastructure/adapter/workflow/langgraph/
├── ChatWorkflow.ts              # 主工作流类，构建 LangGraph 图
├── state/
│   └── ChatWorkflowState.ts     # 工作流状态定义（messages, currentResponse, isComplete, error）
└── node/                        # 可选：节点实现目录
    └── ChatNode.ts              # 聊天节点实现（简化版可直接在主类中）
```

#### 4.3 核心组件设计

**ChatWorkflow 类职责**:
- 构建 LangGraph StateGraph（START -> chat -> END）
- 实现 `buildWorkflow()` 创建图结构
- 实现 `streamChatWorkflow()` 执行流式聊天
- 集成现有 LLMConfig 和 OpenAI 配置

**ChatWorkflowState 接口**:
- 定义工作流执行状态结构
- 包含 messages, currentResponse, isComplete, error 字段
- 支持状态在节点间传递和更新

#### 4.4 Service 层集成点

**StreamChatService 更新**:
- 集成 ChatWorkflow 替代直接 LLM 调用
- 保持现有持久化逻辑（chat_streams 表）
- 实现 `wrapLangGraphStreamWithPersistence` 方法
- 支持错误处理和部分内容保存

#### 4.5 Controller 层扩展

**支持 threadId 参数**:
- 扩展 `StreamChatRequestBody` 接口添加 `threadId?` 字段
- 实现会话连续性（新会话 vs 继续现有会话）
- 保持现有 SSE 事件格式兼容性
- 添加 `stream_start` 和 `stream_complete` 事件类型

#### 4.6 实现流程

1. **状态接口定义**: 创建 ChatWorkflowState
2. **工作流构建**: 实现单节点 LangGraph 工作流
3. **节点实现**: 创建调用 OpenAI 的聊天节点
4. **Service 集成**: 更新 StreamChatService 使用工作流
5. **Controller 更新**: 支持 threadId 和新事件格式
6. **测试验证**: 验证流式输出和会话连续性

#### 4.7 预期功能验证

**核心特性**:
- ✅ LangGraph 单节点工作流创建和执行
- ✅ OpenAI 聊天接口集成（真实流式输出）
- ✅ SSE 格式事件流返回
- ✅ 聊天历史持久化到 chat_streams 表  
- ✅ Thread ID 支持实现会话连续性
- ✅ 错误处理和部分内容保存

**测试场景**:
- 新会话创建和流式响应
- 使用 threadId 继续现有会话
- 网络中断和错误恢复处理

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
