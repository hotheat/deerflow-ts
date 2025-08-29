import { ChatStream } from '@core/domain/chat/entity/ChatStream';

export interface ChatStreamRepositoryPort {
  save(stream: ChatStream): Promise<ChatStream>;
  findByThreadId(threadId: string): Promise<ChatStream | null>;
}