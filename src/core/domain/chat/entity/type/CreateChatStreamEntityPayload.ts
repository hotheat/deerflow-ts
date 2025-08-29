export interface CreateChatStreamEntityPayload {
  id?: string;
  threadId: string;
  messages: any[];
  ts?: Date;
}