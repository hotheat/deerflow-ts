import { Code } from '@core/common/code/Code';
import { Exception } from '@core/common/exception/Exception';
import { CoreAssert } from '@core/common/util/assert/CoreAssert';
import { Media } from '@core/domain/media/entity/Media';
import { MediaRepositoryPort } from '@core/domain/media/port/persistence/MediaRepositoryPort';
import { GetMediaDto } from '@core/domain/media/port/dto/GetMediaDto';
import { MediaInterfaceDto } from '@core/domain/media/port/dto/MediaInterfaceDto';
import { GetMediaInterface } from '@core/domain/media/interface/GetMediaInterface';

export class GetMediaService implements GetMediaInterface {
  
  constructor(
    private readonly mediaRepository: MediaRepositoryPort,
  ) {}
  
  public async execute(payload: GetMediaDto): Promise<MediaInterfaceDto> {
    const media: Media = CoreAssert.notEmpty(
      await this.mediaRepository.findMedia({id: payload.mediaId}),
      Exception.new({code: Code.ENTITY_NOT_FOUND_ERROR, overrideMessage: 'Media not found.'})
    );
  
    const hasAccess: boolean = payload.executorId === media.getOwnerId();
    CoreAssert.isTrue(hasAccess, Exception.new({code: Code.ACCESS_DENIED_ERROR}));
    
    return MediaInterfaceDto.newFromMedia(media);
  }
  
}
