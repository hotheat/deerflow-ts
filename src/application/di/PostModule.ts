import { PostController } from '@application/api/http-rest/controller/PostController';
import { PersistenceModule } from '@application/di/PersistenceModule';
import { MediaDITokens } from '@core/domain/media/di/MediaDITokens';
import { PostDITokens } from '@core/domain/post/di/PostDITokens';
import { UserDITokens } from '@core/domain/user/di/UserDITokens';
import { CreatePostInterface } from '@core/domain/post/interface/CreatePostInterface';
import { EditPostInterface } from '@core/domain/post/interface/EditPostInterface';
import { PublishPostInterface } from '@core/domain/post/interface/PublishPostInterface';
import { RemovePostInterface } from '@core/domain/post/interface/RemovePostInterface';
import { CreatePostService } from '@core/service/post/service/CreatePostService';
import { EditPostService } from '@core/service/post/service/EditPostService';
import { GetPostListService } from '@core/service/post/service/GetPostListService';
import { GetPostService } from '@core/service/post/service/GetPostService';
import { PublishPostService } from '@core/service/post/service/PublishPostService';
import { RemovePostService } from '@core/service/post/service/RemovePostService';
import { PrismaService } from '@infrastructure/adapter/persistence/PrismaService';
import { TransactionalUseCaseWrapper } from '@infrastructure/transaction/TransactionalUseCaseWrapper';
import { Module, Provider } from '@nestjs/common';


const useCaseProviders: Provider[] = [
  {
    provide   : PostDITokens.CreatePostInterface,
    useFactory: (postRepository, userRepository, mediaRepository, prismaService) => {
      const service: CreatePostInterface = new CreatePostService(postRepository, userRepository, mediaRepository);
      return new TransactionalUseCaseWrapper(service, prismaService);
    },
    inject    : [PostDITokens.PostRepository, UserDITokens.UserRepository, MediaDITokens.MediaRepository, PrismaService]
  },
  {
    provide   : PostDITokens.EditPostInterface,
    useFactory: (postRepository, mediaRepository, prismaService) => {
      const service: EditPostInterface = new EditPostService(postRepository, mediaRepository);
      return new TransactionalUseCaseWrapper(service, prismaService);
    },
    inject    : [PostDITokens.PostRepository, MediaDITokens.MediaRepository, PrismaService]
  },
  {
    provide   : PostDITokens.GetPostListInterface,
    useFactory: (postRepository) => new GetPostListService(postRepository),
    inject    : [PostDITokens.PostRepository]
  },
  {
    provide   : PostDITokens.GetPostInterface,
    useFactory: (postRepository) => new GetPostService(postRepository),
    inject    : [PostDITokens.PostRepository]
  },
  {
    provide   : PostDITokens.PublishPostInterface,
    useFactory: (postRepository, prismaService) => {
      const service: PublishPostInterface = new PublishPostService(postRepository);
      return new TransactionalUseCaseWrapper(service, prismaService);
    },
    inject    : [PostDITokens.PostRepository, PrismaService]
  },
  {
    provide   : PostDITokens.RemovePostInterface,
    useFactory: (postRepository, prismaService) => {
      const service: RemovePostInterface = new RemovePostService(postRepository);
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
