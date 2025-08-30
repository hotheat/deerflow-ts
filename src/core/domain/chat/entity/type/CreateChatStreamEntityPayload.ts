export interface CreateChatStreamEntityPayload {
  id?: string;
  threadId: string;
  messages: Array<{ role: string; content: string; timestamp: string }>;
  ts?: Date;
}