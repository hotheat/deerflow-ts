import { MediaController } from '@application/api/http-rest/controller/MediaController';
import { PersistenceModule } from '@application/di/PersistenceModule';
import { MediaDITokens } from '@core/domain/media/di/MediaDITokens';
import { PostDITokens } from '@core/domain/post/di/PostDITokens';
import { CreateMediaUseCase } from '@core/domain/media/usecase/CreateMediaUseCase';
import { EditMediaUseCase } from '@core/domain/media/usecase/EditMediaUseCase';
import { RemoveMediaUseCase } from '@core/domain/media/usecase/RemoveMediaUseCase';
import { CreateMediaService } from '@core/service/media/usecase/CreateMediaService';
import { EditMediaService } from '@core/service/media/usecase/EditMediaService';
import { GetMediaListService } from '@core/service/media/usecase/GetMediaListService';
import { GetMediaService } from '@core/service/media/usecase/GetMediaService';
import { RemoveMediaService } from '@core/service/media/usecase/RemoveMediaService';
import { TransactionalUseCaseWrapper } from '@infrastructure/transaction/TransactionalUseCaseWrapper';
import { Module } from '@nestjs/common';
import { Provider } from '@nestjs/common/interfaces/modules/provider.interface';


const useCaseProviders: Provider[] = [
  {
    provide   : MediaDITokens.CreateMediaUseCase,
    useFactory: (mediaRepository, mediaFileStorage) => {
      const service: CreateMediaUseCase = new CreateMediaService(mediaRepository, mediaFileStorage);
      return new TransactionalUseCaseWrapper(service);
    },
    inject    : [MediaDITokens.MediaRepository, MediaDITokens.MediaFileStorage]
  },
  {
    provide   : MediaDITokens.EditMediaUseCase,
    useFactory: (mediaRepository) => {
      const service: EditMediaUseCase = new EditMediaService(mediaRepository);
      return new TransactionalUseCaseWrapper(service);
      
    },
    inject    : [MediaDITokens.MediaRepository]
  },
  {
    provide   : MediaDITokens.GetMediaListUseCase,
    useFactory: (mediaRepository) => new GetMediaListService(mediaRepository),
    inject    : [MediaDITokens.MediaRepository]
  },
  {
    provide   : MediaDITokens.GetMediaUseCase,
    useFactory: (mediaRepository) => new GetMediaService(mediaRepository),
    inject    : [MediaDITokens.MediaRepository]
  },
  {
    provide   : MediaDITokens.RemoveMediaUseCase,
    useFactory: (mediaRepository, postRepository) => {
      const service: RemoveMediaUseCase = new RemoveMediaService(mediaRepository, postRepository);
      return new TransactionalUseCaseWrapper(service);
    },
    inject    : [MediaDITokens.MediaRepository, PostDITokens.PostRepository]
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
