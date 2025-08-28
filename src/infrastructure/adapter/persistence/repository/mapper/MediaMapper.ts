import { Media } from '@core/domain/media/entity/Media';
import { FileMetadata } from '@core/domain/media/value-object/FileMetadata';
import { Media as PrismaMedia, MediaType } from '@prisma/client';
import { MediaType as DomainMediaType } from '@core/common/enums/MediaEnums';

export class MediaMapper {
  
  public static toDomainEntity(prismaMedia: PrismaMedia): Media {
    const metadata: FileMetadata = new FileMetadata({
      relativePath: prismaMedia.relativePath || '',
      size        : prismaMedia.size || 0,
      ext         : prismaMedia.ext || '',
      mimetype    : prismaMedia.mimetype || '',
    });
    
    const domainMedia: Media = new Media({
      ownerId  : prismaMedia.ownerId || '',
      name     : prismaMedia.name || '',
      type     : prismaMedia.type as DomainMediaType,
      metadata : metadata,
      id       : prismaMedia.id,
      createdAt: prismaMedia.createdAt || new Date(),
      editedAt : prismaMedia.editedAt || undefined,
      removedAt: prismaMedia.removedAt || undefined,
    });
    
    return domainMedia;
  }
  
  public static toDomainEntities(prismaMedias: PrismaMedia[]): Media[] {
    return prismaMedias.map(prismaMedia => this.toDomainEntity(prismaMedia));
  }
  
  public static toPersistenceEntity(domainMedia: Media): Omit<PrismaMedia, never> {
    return {
      id          : domainMedia.getId(),
      ownerId     : domainMedia.getOwnerId(),
      name        : domainMedia.getName(),
      type        : domainMedia.getType() as MediaType,
      relativePath: domainMedia.getMetadata().relativePath,
      size        : domainMedia.getMetadata().size,
      ext         : domainMedia.getMetadata().ext,
      mimetype    : domainMedia.getMetadata().mimetype,
      createdAt   : domainMedia.getCreatedAt(),
      editedAt    : domainMedia.getEditedAt(),
      removedAt   : domainMedia.getRemovedAt(),
    };
  }
  
  public static toPersistenceEntities(domainMedias: Media[]): Omit<PrismaMedia, never>[] {
    return domainMedias.map(domainMedia => this.toPersistenceEntity(domainMedia));
  }
  
}