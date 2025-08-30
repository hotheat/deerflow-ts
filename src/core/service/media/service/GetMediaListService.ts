import { Media } from '@core/domain/media/entity/Media';
import { MediaRepositoryPort } from '@core/domain/media/port/persistence/MediaRepositoryPort';
import { GetMediaListDto } from '@core/domain/media/port/dto/GetMediaListDto';
import { MediaInterfaceDto } from '@core/domain/media/port/dto/MediaInterfaceDto';
import { GetMediaListInterface } from '@core/domain/media/interface/GetMediaListInterface';

export class GetMediaListService implements GetMediaListInterface {
  
  constructor(
    private readonly mediaRepository: MediaRepositoryPort,
  ) {}
  
  public async execute(payload: GetMediaListDto): Promise<MediaInterfaceDto[]> {
    const medias: Media[] = await this.mediaRepository.findMedias({ownerId: payload.executorId});
    return MediaInterfaceDto.newListFromMedias(medias);
  }
  
}
