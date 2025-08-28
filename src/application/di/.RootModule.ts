import { AuthModule } from '@application/di/AuthModule';
import { ChatModule } from '@application/di/ChatModule';
import { InfrastructureModule } from '@application/di/InfrastructureModule';
import { MediaModule } from '@application/di/MediaModule';
import { PersistenceModule } from '@application/di/PersistenceModule';
import { PostModule } from '@application/di/PostModule';
import { UserModule } from '@application/di/UserModule';
import { Module } from '@nestjs/common';

@Module({
  imports: [
    InfrastructureModule,
    PersistenceModule,
    AuthModule,
    UserModule,
    MediaModule,
    PostModule,
    ChatModule,
  ]
})
export class RootModule {}
