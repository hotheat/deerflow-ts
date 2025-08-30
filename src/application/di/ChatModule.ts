import { Module } from '@nestjs/common';
import { ChatController } from '@application/api/http-rest/controller/ChatController';
import { ChatStreamRepositoryAdapter } from '@infrastructure/adapter/persistence/repository/chat/ChatStreamRepositoryAdapter';
import { ChatWorkflow } from '@infrastructure/adapter/workflow/langgraph/ChatWorkflow';
import { LangGraphChatAdapter } from '@infrastructure/adapter/workflow/langgraph/LangGraphChatAdapter';
import { StreamChatService } from '@core/service/chat/service/StreamChatService';
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
    {
      provide: ChatDITokens.ChatWorkflowAdapterPort,
      useClass: LangGraphChatAdapter,
    },
    {
      provide: ChatDITokens.StreamChatInterface,
      useClass: StreamChatService,
    },
    StreamChatService,
  ],
  exports: [
    ChatDITokens.ChatWorkflowAdapterPort, 
    ChatDITokens.StreamChatInterface, 
    StreamChatService
  ],
})
export class ChatModule {}