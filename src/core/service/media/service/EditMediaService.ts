import { Code } from '@core/common/code/Code';
import { Exception } from '@core/common/exception/Exception';
import { CoreAssert } from '@core/common/util/assert/CoreAssert';
import { Media } from '@core/domain/media/entity/Media';
import { MediaRepositoryPort } from '@core/domain/media/port/persistence/MediaRepositoryPort';
import { EditMediaDto } from '@core/domain/media/port/dto/EditMediaDto';
import { MediaInterfaceDto } from '@core/domain/media/port/dto/MediaInterfaceDto';
import { EditMediaInterface } from '@core/domain/media/interface/EditMediaInterface';

export class EditMediaService implements EditMediaInterface {
  
  constructor(
    private readonly mediaRepository: MediaRepositoryPort,
  ) {}
  
  public async execute(payload: EditMediaDto): Promise<MediaInterfaceDto> {
    const media: Media = CoreAssert.notEmpty(
      await this.mediaRepository.findMedia({id: payload.mediaId}),
      Exception.new({code: Code.ENTITY_NOT_FOUND_ERROR, overrideMessage: 'Media not found.'})
    );
    
    const hasAccess: boolean = payload.executorId === media.getOwnerId();
    CoreAssert.isTrue(hasAccess, Exception.new({code: Code.ACCESS_DENIED_ERROR}));
    
    await media.edit({name: payload.name});
    await this.mediaRepository.updateMedia(media);
    
    return MediaInterfaceDto.newFromMedia(media);
  }
  
}
