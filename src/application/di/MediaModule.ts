import { MediaController } from '@application/api/http-rest/controller/MediaController';
import { PersistenceModule } from '@application/di/PersistenceModule';
import { MediaDITokens } from '@core/domain/media/di/MediaDITokens';
import { PostDITokens } from '@core/domain/post/di/PostDITokens';
import { CreateMediaInterface } from '@core/domain/media/interface/CreateMediaInterface';
import { EditMediaInterface } from '@core/domain/media/interface/EditMediaInterface';
import { RemoveMediaInterface } from '@core/domain/media/interface/RemoveMediaInterface';
import { CreateMediaService } from '@core/service/media/service/CreateMediaService';
import { EditMediaService } from '@core/service/media/service/EditMediaService';
import { GetMediaListService } from '@core/service/media/service/GetMediaListService';
import { GetMediaService } from '@core/service/media/service/GetMediaService';
import { RemoveMediaService } from '@core/service/media/service/RemoveMediaService';
import { PrismaService } from '@infrastructure/adapter/persistence/PrismaService';
import { TransactionalUseCaseWrapper } from '@infrastructure/transaction/TransactionalUseCaseWrapper';
import { Module } from '@nestjs/common';
import { Provider } from '@nestjs/common/interfaces/modules/provider.interface';


const useCaseProviders: Provider[] = [
  {
    provide   : MediaDITokens.CreateMediaInterface,
    useFactory: (mediaRepository, mediaFileStorage, prismaService) => {
      const service: CreateMediaInterface = new CreateMediaService(mediaRepository, mediaFileStorage);
      return new TransactionalUseCaseWrapper(service, prismaService);
    },
    inject    : [MediaDITokens.MediaRepository, MediaDITokens.MediaFileStorage, PrismaService]
  },
  {
    provide   : MediaDITokens.EditMediaInterface,
    useFactory: (mediaRepository, prismaService) => {
      const service: EditMediaInterface = new EditMediaService(mediaRepository);
      return new TransactionalUseCaseWrapper(service, prismaService);
      
    },
    inject    : [MediaDITokens.MediaRepository, PrismaService]
  },
  {
    provide   : MediaDITokens.GetMediaListInterface,
    useFactory: (mediaRepository) => new GetMediaListService(mediaRepository),
    inject    : [MediaDITokens.MediaRepository]
  },
  {
    provide   : MediaDITokens.GetMediaInterface,
    useFactory: (mediaRepository) => new GetMediaService(mediaRepository),
    inject    : [MediaDITokens.MediaRepository]
  },
  {
    provide   : MediaDITokens.RemoveMediaInterface,
    useFactory: (mediaRepository, postRepository, prismaService) => {
      const service: RemoveMediaInterface = new RemoveMediaService(mediaRepository, postRepository);
      return new TransactionalUseCaseWrapper(service, prismaService);
    },
    inject    : [MediaDITokens.MediaRepository, PostDITokens.PostRepository, PrismaService]
  },
];


@Module({
  imports: [
    PersistenceModule
  ],
  controllers: [
    MediaController
  ],
  providers: [
    ...useCaseProviders,
  ],
  exports: []
})
export class MediaModule {}
