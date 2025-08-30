import { MediaType } from '@core/common/enums/MediaEnums';
import { Nullable } from '@core/common/type/CommonTypes';
import { Media } from '@core/domain/media/entity/Media';
import { Exclude, Expose, plainToClass } from 'class-transformer';

@Exclude()
export class MediaInterfaceDto {

  @Expose()
  public id: string;

  @Expose()
  public ownerId: string;

  @Expose()
  public name: string;

  @Expose()
  public type: MediaType;

  public url: string;

  public createdAt: number;

  public editedAt: Nullable<number>;

  public static newFromMedia(media: Media): MediaInterfaceDto {
    const dto: MediaInterfaceDto = plainToClass(MediaInterfaceDto, media);

    dto.url = media.getMetadata().relativePath;
    dto.createdAt = media.getCreatedAt().getTime();
    dto.editedAt = media.getEditedAt()?.getTime() || null;

    return dto;
  }

  public static newListFromMedias(medias: Media[]): MediaInterfaceDto[] {
    return medias.map(media => this.newFromMedia(media));
  }

}
