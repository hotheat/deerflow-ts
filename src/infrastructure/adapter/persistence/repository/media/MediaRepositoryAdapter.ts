import { Injectable } from '@nestjs/common';
import { RepositoryFindOptions, RepositoryRemoveOptions } from '@core/common/persistence/RepositoryOptions';
import { Optional } from '@core/common/type/CommonTypes';
import { Media } from '@core/domain/media/entity/Media';
import { MediaRepositoryPort } from '@core/domain/media/port/persistence/MediaRepositoryPort';
import { PrismaService } from '@infrastructure/adapter/persistence/PrismaService';
import { MediaMapper } from '@infrastructure/adapter/persistence/repository/mapper/MediaMapper';
import { PrismaClient, Prisma } from '@prisma/client';

@Injectable()
export class MediaRepositoryAdapter implements MediaRepositoryPort {
  
  constructor(
    private readonly prismaService: PrismaService,
  ) {}
  
  public async findMedia(by: {id?: string}, options: RepositoryFindOptions = {}): Promise<Optional<Media>> {
    const client: PrismaClient | Prisma.TransactionClient = this.prismaService.getClient();
    
    const whereCondition: Prisma.MediaWhereInput = {};
    
    if (by.id) {
      whereCondition.id = by.id;
    }
    
    if (!options.includeRemoved) {
      whereCondition.removedAt = null;
    }
    
    const prismaMedia: Prisma.MediaGetPayload<Record<string, never>> | null = await client.media.findFirst({
      where: whereCondition
    });
    
    if (!prismaMedia) {
      return undefined;
    }
    
    return MediaMapper.toDomainEntity(prismaMedia);
  }
  
  public async findMedias(by: {ownerId?: string}, options: RepositoryFindOptions = {}): Promise<Media[]> {
    const client: PrismaClient | Prisma.TransactionClient = this.prismaService.getClient();
    
    const whereCondition: Prisma.MediaWhereInput = {};
    
    if (by.ownerId) {
      whereCondition.ownerId = by.ownerId;
    }
    
    if (!options.includeRemoved) {
      whereCondition.removedAt = null;
    }
    
    const prismaMedias: Prisma.MediaGetPayload<Record<string, never>>[] = await client.media.findMany({
      where: whereCondition,
      take: options.limit,
      skip: options.offset,
    });
    
    return MediaMapper.toDomainEntities(prismaMedias);
  }
  
  public async countMedias(by: {id?: string, ownerId?: string}, options: RepositoryFindOptions = {}): Promise<number> {
    const client: PrismaClient | Prisma.TransactionClient = this.prismaService.getClient();
    
    const whereCondition: Prisma.MediaWhereInput = {};
    
    if (by.id) {
      whereCondition.id = by.id;
    }
    
    if (by.ownerId) {
      whereCondition.ownerId = by.ownerId;
    }
    
    if (!options.includeRemoved) {
      whereCondition.removedAt = null;
    }
    
    return client.media.count({
      where: whereCondition
    });
  }
  
  public async addMedia(media: Media): Promise<{id: string}> {
    const client: PrismaClient | Prisma.TransactionClient = this.prismaService.getClient();
    const mediaData: Prisma.MediaCreateInput = MediaMapper.toPersistenceEntity(media);
    
    const createdMedia: Prisma.MediaGetPayload<Record<string, never>> = await client.media.create({
      data: mediaData
    });
    
    return {
      id: createdMedia.id
    };
  }
  
  public async updateMedia(media: Media): Promise<void> {
    const client: PrismaClient | Prisma.TransactionClient = this.prismaService.getClient();
    const mediaData: Prisma.MediaUpdateInput = MediaMapper.toPersistenceEntity(media);
    
    await client.media.update({
      where: { id: media.getId() },
      data: mediaData
    });
  }
  
  public async removeMedia(media: Media, options: RepositoryRemoveOptions = {}): Promise<void> {
    const client: PrismaClient | Prisma.TransactionClient = this.prismaService.getClient();
    await media.remove();
    
    if (options.disableSoftDeleting) {
      await client.media.delete({
        where: { id: media.getId() }
      });
    } else {
      const mediaData: Prisma.MediaUpdateInput = MediaMapper.toPersistenceEntity(media);
      await client.media.update({
        where: { id: media.getId() },
        data: mediaData
      });
    }
  }
  
}