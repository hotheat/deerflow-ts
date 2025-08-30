import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/adapter/persistence/PrismaService';
import { ChatStream } from '@core/domain/chat/entity/ChatStream';
import { ChatStreamRepositoryPort } from '@core/domain/chat/port/persistence/ChatStreamRepositoryPort';
import { PrismaClient, Prisma } from '@prisma/client';

@Injectable()
export class ChatStreamRepositoryAdapter implements ChatStreamRepositoryPort {
  
  constructor(private readonly prismaService: PrismaService) {}

  public async save(stream: ChatStream): Promise<ChatStream> {
    const client: PrismaClient | Prisma.TransactionClient = this.prismaService.getClient();
    
    // Check if record exists (mapping Python: cursor.execute("SELECT id FROM chat_streams WHERE thread_id = %s"))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existing: any = await client.chatStream.findUnique({
      where: { threadId: stream.threadId }
    });

    if (existing) {
      // Update existing record (mapping Python: UPDATE chat_streams SET messages = %s, ts = %s)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updated: any = await client.chatStream.update({
        where: { threadId: stream.threadId },
        data: {
          messages: stream.messages,
          ts: new Date()
        }
      });
      
      return ChatStream.new({
        id: updated.id,
        threadId: updated.threadId,
        messages: updated.messages as Array<{ role: string; content: string; timestamp: string }>,
        ts: updated.ts
      });
    } else {
      // Create new record (mapping Python: INSERT INTO chat_streams)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const created: any = await client.chatStream.create({
        data: {
          threadId: stream.threadId,
          messages: stream.messages,
          ts: new Date()
        }
      });
      
      return ChatStream.new({
        id: created.id,
        threadId: created.threadId,
        messages: created.messages as Array<{ role: string; content: string; timestamp: string }>,
        ts: created.ts
      });
    }
  }

  public async findByThreadId(threadId: string): Promise<ChatStream | null> {
    const client: PrismaClient | Prisma.TransactionClient = this.prismaService.getClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const found: any = await client.chatStream.findUnique({
      where: { threadId }
    });

    if (!found) return null;

    return ChatStream.new({
      id: found.id,
      threadId: found.threadId,
      messages: found.messages as Array<{ role: string; content: string; timestamp: string }>,
      ts: found.ts
    });
  }
}