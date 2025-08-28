import { PostController } from '@application/api/http-rest/controller/PostController';
import { PersistenceModule } from '@application/di/PersistenceModule';
import { MediaDITokens } from '@core/domain/media/di/MediaDITokens';
import { PostDITokens } from '@core/domain/post/di/PostDITokens';
import { UserDITokens } from '@core/domain/user/di/UserDITokens';
import { CreatePostUseCase } from '@core/domain/post/usecase/CreatePostUseCase';
import { EditPostUseCase } from '@core/domain/post/usecase/EditPostUseCase';
import { PublishPostUseCase } from '@core/domain/post/usecase/PublishPostUseCase';
import { RemovePostUseCase } from '@core/domain/post/usecase/RemovePostUseCase';
import { CreatePostService } from '@core/service/post/usecase/CreatePostService';
import { EditPostService } from '@core/service/post/usecase/EditPostService';
import { GetPostListService } from '@core/service/post/usecase/GetPostListService';
import { GetPostService } from '@core/service/post/usecase/GetPostService';
import { PublishPostService } from '@core/service/post/usecase/PublishPostService';
import { RemovePostService } from '@core/service/post/usecase/RemovePostService';
import { PrismaService } from '@infrastructure/adapter/persistence/PrismaService';
import { TransactionalUseCaseWrapper } from '@infrastructure/transaction/TransactionalUseCaseWrapper';
import { Module, Provider } from '@nestjs/common';


const useCaseProviders: Provider[] = [
  {
    provide   : PostDITokens.CreatePostUseCase,
    useFactory: (postRepository, userRepository, mediaRepository, prismaService) => {
      const service: CreatePostUseCase = new CreatePostService(postRepository, userRepository, mediaRepository);
      return new TransactionalUseCaseWrapper(service, prismaService);
    },
    inject    : [PostDITokens.PostRepository, UserDITokens.UserRepository, MediaDITokens.MediaRepository, PrismaService]
  },
  {
    provide   : PostDITokens.EditPostUseCase,
    useFactory: (postRepository, mediaRepository, prismaService) => {
      const service: EditPostUseCase = new EditPostService(postRepository, mediaRepository);
      return new TransactionalUseCaseWrapper(service, prismaService);
    },
    inject    : [PostDITokens.PostRepository, MediaDITokens.MediaRepository, PrismaService]
  },
  {
    provide   : PostDITokens.GetPostListUseCase,
    useFactory: (postRepository) => new GetPostListService(postRepository),
    inject    : [PostDITokens.PostRepository]
  },
  {
    provide   : PostDITokens.GetPostUseCase,
    useFactory: (postRepository) => new GetPostService(postRepository),
    inject    : [PostDITokens.PostRepository]
  },
  {
    provide   : PostDITokens.PublishPostUseCase,
    useFactory: (postRepository, prismaService) => {
      const service: PublishPostUseCase = new PublishPostService(postRepository);
      return new TransactionalUseCaseWrapper(service, prismaService);
    },
    inject    : [PostDITokens.PostRepository, PrismaService]
  },
  {
    provide   : PostDITokens.RemovePostUseCase,
    useFactory: (postRepository, prismaService) => {
      const service: RemovePostUseCase = new RemovePostService(postRepository);
      return new TransactionalUseCaseWrapper(service, prismaService);
    },
    inject    : [PostDITokens.PostRepository, PrismaService]
  },
];


@Module({
  imports: [
    PersistenceModule
  ],
  controllers: [
    PostController
  ],
  providers: [
    ...useCaseProviders,
  ],
  exports: []
})
export class PostModule {}
