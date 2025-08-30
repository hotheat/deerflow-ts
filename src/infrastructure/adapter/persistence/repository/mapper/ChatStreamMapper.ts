import { ChatStream } from '@core/domain/chat/entity/ChatStream';
import { ChatStream as PrismaChatStream } from '@prisma/client';

export class ChatStreamMapper {

  public static toDomainEntity(prismaChatStream: PrismaChatStream): ChatStream {
    const domainChatStream: ChatStream = new ChatStream({
      id: prismaChatStream.id,
      threadId: prismaChatStream.threadId,
      messages: prismaChatStream.messages as Array<{ role: string; content: string; timestamp: string }>,
      ts: prismaChatStream.ts,
    });
    return domainChatStream;
  }

  public static toDomainEntities(prismaChatStreams: PrismaChatStream[]): ChatStream[] {
    return prismaChatStreams.map(prismaChatStream => this.toDomainEntity(prismaChatStream));
  }

  public static toPersistenceEntity(domainChatStream: ChatStream): Omit<PrismaChatStream, never> {
    return {
      id: domainChatStream.getId(),
      threadId: domainChatStream.threadId,
      messages: domainChatStream.messages,
      ts: domainChatStream.ts,
    };
  }

  public static toPersistenceEntities(domainChatStreams: ChatStream[]): Omit<PrismaChatStream, never>[] {
    return domainChatStreams.map(domainChatStream => this.toPersistenceEntity(domainChatStream));
  }

}