import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/adapter/persistence/PrismaService';
import { ChatStream } from '@core/domain/chat/entity/ChatStream';
import { ChatStreamRepositoryPort } from '@core/domain/chat/port/persistence/ChatStreamRepositoryPort';
import { PrismaClient, Prisma, ChatStream as PrismaChatStream } from '@prisma/client';
import { ChatStreamMapper } from '@infrastructure/adapter/persistence/repository/mapper/ChatStreamMapper';

@Injectable()
export class ChatStreamRepositoryAdapter implements ChatStreamRepositoryPort {
  
  constructor(private readonly prismaService: PrismaService) {}

  public async save(stream: ChatStream): Promise<ChatStream> {
    const client: PrismaClient | Prisma.TransactionClient = this.prismaService.getClient();
    
    // Check if record exists
    const existing: PrismaChatStream | null = await client.chatStream.findUnique({
      where: { threadId: stream.threadId }
    });

    if (existing) {
      // Update existing record
      const updated: PrismaChatStream = await client.chatStream.update({
        where: { threadId: stream.threadId },
        data: {
          messages: stream.messages,
          ts: new Date()
        }
      });
      
      return ChatStreamMapper.toDomainEntity(updated);
    } else {
      // Create new record
      const created: PrismaChatStream = await client.chatStream.create({
        data: {
          threadId: stream.threadId,
          messages: stream.messages,
          ts: new Date()
        }
      });
      
      return ChatStreamMapper.toDomainEntity(created);
    }
  }

  public async findByThreadId(threadId: string): Promise<ChatStream | null> {
    const client: PrismaClient | Prisma.TransactionClient = this.prismaService.getClient();
    const found: PrismaChatStream | null = await client.chatStream.findUnique({
      where: { threadId }
    });

    if (!found) return null;

    return ChatStreamMapper.toDomainEntity(found);
  }
}