import { Module } from '@nestjs/common';
import { ChatController } from '@application/api/http-rest/controller/ChatController';

@Module({
  controllers: [ChatController],
  providers: [],
})
export class ChatModule {}