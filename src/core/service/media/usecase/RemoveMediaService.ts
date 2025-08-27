import { Code } from '@core/common/code/Code';
import { MediaType } from '@core/common/enums/MediaEnums';
import { Exception } from '@core/common/exception/Exception';
import { CoreAssert } from '@core/common/util/assert/CoreAssert';
import { Media } from '@core/domain/media/entity/Media';
import { MediaRepositoryPort } from '@core/domain/media/port/persistence/MediaRepositoryPort';
import { RemoveMediaPort } from '@core/domain/media/port/usecase/RemoveMediaPort';
import { RemoveMediaUseCase } from '@core/domain/media/usecase/RemoveMediaUseCase';
import { PostRepositoryPort } from '@core/domain/post/port/persistence/PostRepositoryPort';

export class RemoveMediaService implements RemoveMediaUseCase {
  
  constructor(
    private readonly mediaRepository: MediaRepositoryPort,
    private readonly postRepository: PostRepositoryPort,
  ) {}
  
  public async execute(payload: RemoveMediaPort): Promise<void> {
    const media: Media = CoreAssert.notEmpty(
      await this.mediaRepository.findMedia({id: payload.mediaId}),
      Exception.new({code: Code.ENTITY_NOT_FOUND_ERROR, overrideMessage: 'Media not found.'})
    );
  
    const hasAccess: boolean = payload.executorId === media.getOwnerId();
    CoreAssert.isTrue(hasAccess, Exception.new({code: Code.ACCESS_DENIED_ERROR}));
    
    // Update posts that reference this media before removing it
    if (media.getType() === MediaType.IMAGE) {
      await this.postRepository.updatePosts({imageId: null}, {imageId: media.getId()});
    }
    
    await this.mediaRepository.removeMedia(media);
  }
  
}
