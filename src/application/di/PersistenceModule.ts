import { MediaDITokens } from '@core/domain/media/di/MediaDITokens';
import { PostDITokens } from '@core/domain/post/di/PostDITokens';
import { UserDITokens } from '@core/domain/user/di/UserDITokens';
import { MinioMediaFileStorageAdapter } from '@infrastructure/adapter/persistence/media-file/MinioMediaFileStorageAdapter';
import { PrismaService } from '@infrastructure/adapter/persistence/PrismaService';
import { MediaRepositoryAdapter } from '@infrastructure/adapter/persistence/repository/media/MediaRepositoryAdapter';
import { PostRepositoryAdapter } from '@infrastructure/adapter/persistence/repository/post/PostRepositoryAdapter';
import { UserRepositoryAdapter } from '@infrastructure/adapter/persistence/repository/user/UserRepositoryAdapter';
import { Module, Provider } from '@nestjs/common';

const persistenceProviders: Provider[] = [
  PrismaService,
  {
    provide : MediaDITokens.MediaFileStorage,
    useClass: MinioMediaFileStorageAdapter,
  },
  {
    provide : MediaDITokens.MediaRepository,
    useClass: MediaRepositoryAdapter,
  },
  {
    provide : PostDITokens.PostRepository,
    useClass: PostRepositoryAdapter,
  },
  {
    provide : UserDITokens.UserRepository,
    useClass: UserRepositoryAdapter,
  }
];

@Module({
  providers: persistenceProviders,
  exports: [
    PrismaService,
    MediaDITokens.MediaFileStorage,
    MediaDITokens.MediaRepository,
    PostDITokens.PostRepository,
    UserDITokens.UserRepository
  ]
})
export class PersistenceModule {}