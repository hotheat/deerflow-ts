import { Module } from '@nestjs/common';
import { ChatController } from '@application/api/http-rest/controller/ChatController';
import { ChatStreamRepositoryAdapter } from '@infrastructure/adapter/persistence/repository/chat/ChatStreamRepositoryAdapter';
import { ChatDITokens } from '@core/domain/chat/di/ChatDITokens';
import { PersistenceModule } from '@application/di/PersistenceModule';

@Module({
  imports: [PersistenceModule],
  controllers: [ChatController],
  providers: [
    {
      provide: ChatDITokens.ChatStreamRepository,
      useClass: ChatStreamRepositoryAdapter,
    },
  ],
})
export class ChatModule {}