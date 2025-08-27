import { MediaDITokens } from '@core/domain/media/di/MediaDITokens';
import { PostDITokens } from '@core/domain/post/di/PostDITokens';
import { UserDITokens } from '@core/domain/user/di/UserDITokens';
import { MinioMediaFileStorageAdapter } from '@infrastructure/adapter/persistence/media-file/MinioMediaFileStorageAdapter';
import { TypeOrmMediaRepositoryAdapter } from '@infrastructure/adapter/persistence/typeorm/repository/media/TypeOrmMediaRepositoryAdapter';
import { TypeOrmPostRepositoryAdapter } from '@infrastructure/adapter/persistence/typeorm/repository/post/TypeOrmPostRepositoryAdapter';
import { TypeOrmUserRepositoryAdapter } from '@infrastructure/adapter/persistence/typeorm/repository/user/TypeOrmUserRepositoryAdapter';
import { Module, Provider } from '@nestjs/common';
import { Connection } from 'typeorm';

const persistenceProviders: Provider[] = [
  {
    provide : MediaDITokens.MediaFileStorage,
    useClass: MinioMediaFileStorageAdapter,
  },
  {
    provide   : MediaDITokens.MediaRepository,
    useFactory: connection => connection.getCustomRepository(TypeOrmMediaRepositoryAdapter),
    inject    : [Connection]
  },
  {
    provide   : PostDITokens.PostRepository,
    useFactory: connection => connection.getCustomRepository(TypeOrmPostRepositoryAdapter),
    inject    : [Connection]
  },
  {
    provide   : UserDITokens.UserRepository,
    useFactory: connection => connection.getCustomRepository(TypeOrmUserRepositoryAdapter),
    inject    : [Connection]
  }
];

@Module({
  providers: persistenceProviders,
  exports: [
    MediaDITokens.MediaFileStorage,
    MediaDITokens.MediaRepository,
    PostDITokens.PostRepository,
    UserDITokens.UserRepository
  ]
})
export class PersistenceModule {}