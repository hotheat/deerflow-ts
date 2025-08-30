import { Media } from '@core/domain/media/entity/Media';
import { MediaFileStoragePort } from '@core/domain/media/port/persistence/MediaFileStoragePort';
import { MediaRepositoryPort } from '@core/domain/media/port/persistence/MediaRepositoryPort';
import { CreateMediaDto } from '@core/domain/media/port/dto/CreateMediaDto';
import { CreateMediaInterface } from '@core/domain/media/interface/CreateMediaInterface';
import { MediaInterfaceDto } from '@core/domain/media/port/dto/MediaInterfaceDto';
import { FileMetadata } from '@core/domain/media/value-object/FileMetadata';

export class CreateMediaService implements CreateMediaInterface {
  
  constructor(
    private readonly mediaRepository: MediaRepositoryPort,
    private readonly mediaFileStorage: MediaFileStoragePort,
  ) {}
  
  public async execute(payload: CreateMediaDto): Promise<MediaInterfaceDto> {
    const fileMetaData: FileMetadata = await this.mediaFileStorage.upload(payload.file, {type: payload.type});
    
    const media: Media = await Media.new({
      ownerId: payload.executorId,
      name: payload.name,
      type: payload.type,
      metadata: fileMetaData,
    });
    
    await this.mediaRepository.addMedia(media);
    
    return MediaInterfaceDto.newFromMedia(media);
  }
  
}
