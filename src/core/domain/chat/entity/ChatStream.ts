import { Entity } from '@core/common/entity/Entity';
import { IsNotEmpty, IsString, IsArray } from 'class-validator';
import { CreateChatStreamEntityPayload } from '@core/domain/chat/entity/type/CreateChatStreamEntityPayload';
import { v4 } from 'uuid';

export class ChatStream extends Entity<string> {
  
  @IsString()
  @IsNotEmpty()
  private readonly _threadId: string;

  @IsArray()
  private _messages: any[];

  private _ts: Date;

  constructor(payload: CreateChatStreamEntityPayload) {
    super();
    this._threadId = payload.threadId;
    this._messages = payload.messages || [];
    this._ts = payload.ts || new Date();
    
    this.id = payload.id || v4();
  }

  public static async new(payload: CreateChatStreamEntityPayload): Promise<ChatStream> {
    const stream = new ChatStream(payload);
    await stream.validate();
    return stream;
  }

  public updateMessages(messages: any[]): void {
    this._messages = messages;
    this._ts = new Date();
  }

  get threadId(): string { 
    return this._threadId; 
  }
  
  get messages(): any[] { 
    return [...this._messages]; 
  }
  
  get ts(): Date { 
    return this._ts; 
  }
}