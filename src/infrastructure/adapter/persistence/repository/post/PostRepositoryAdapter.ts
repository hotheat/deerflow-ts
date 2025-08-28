import { Injectable } from '@nestjs/common';
import { PostStatus } from '@core/common/enums/PostEnums';
import { RepositoryFindOptions, RepositoryRemoveOptions, RepositoryUpdateManyOptions } from '@core/common/persistence/RepositoryOptions';
import { Nullable, Optional } from '@core/common/type/CommonTypes';
import { Post } from '@core/domain/post/entity/Post';
import { PostRepositoryPort } from '@core/domain/post/port/persistence/PostRepositoryPort';
import { PrismaService } from '@infrastructure/adapter/persistence/PrismaService';
import { PostMapper, PostWithRelations } from '@infrastructure/adapter/persistence/repository/mapper/PostMapper';
import { PrismaClient, Prisma } from '@prisma/client';

@Injectable()
export class PostRepositoryAdapter implements PostRepositoryPort {
  
  constructor(
    private readonly prismaService: PrismaService,
  ) {}
  
  public async findPost(by: {id?: string}, options: RepositoryFindOptions = {}): Promise<Optional<Post>> {
    const client: PrismaClient | Prisma.TransactionClient = this.prismaService.getClient();
    
    const whereCondition: Prisma.PostWhereInput = {};
    
    if (by.id) {
      whereCondition.id = by.id;
    }
    
    if (!options.includeRemoved) {
      whereCondition.removedAt = null;
    }
    
    const prismaPost: PostWithRelations | null = await client.post.findFirst({
      where: whereCondition
      // Note: We need to add relations to schema for this to work
      // For now, we'll handle this in the service layer or use raw queries
    });
    
    if (!prismaPost) {
      return undefined;
    }
    
    // For now, casting to PostWithRelations - we'll need to add proper relations
    return PostMapper.toDomainEntity(prismaPost as PostWithRelations);
  }
  
  public async findPosts(by: {ownerId?: string, status?: PostStatus}, options: RepositoryFindOptions = {}): Promise<Post[]> {
    const client: PrismaClient | Prisma.TransactionClient = this.prismaService.getClient();
    
    const whereCondition: Prisma.PostWhereInput = {};
    
    if (by.ownerId) {
      whereCondition.ownerId = by.ownerId;
    }
    
    if (by.status) {
      whereCondition.status = by.status;
    }
    
    if (!options.includeRemoved) {
      whereCondition.removedAt = null;
    }
    
    const prismaPosts: PostWithRelations[] = await client.post.findMany({
      where: whereCondition,
      take: options.limit,
      skip: options.offset
      // Note: We need to add relations to schema for this to work
    });
    
    return PostMapper.toDomainEntities(prismaPosts as PostWithRelations[]);
  }
  
  public async addPost(post: Post): Promise<{id: string}> {
    const client: PrismaClient | Prisma.TransactionClient = this.prismaService.getClient();
    const postData: Prisma.PostCreateInput = PostMapper.toPersistenceEntity(post);
    
    const createdPost: Prisma.PostGetPayload<Record<string, never>> = await client.post.create({
      data: postData
    });
    
    return {
      id: createdPost.id
    };
  }
  
  public async updatePost(post: Post): Promise<void> {
    const client: PrismaClient | Prisma.TransactionClient = this.prismaService.getClient();
    const postData: Prisma.PostUpdateInput = PostMapper.toPersistenceEntity(post);
    
    await client.post.update({
      where: { id: post.getId() },
      data: postData
    });
  }
  
  public async updatePosts(values: {imageId?: Nullable<string>}, by: {imageId?: string}, options: RepositoryUpdateManyOptions = {}): Promise<void> {
    const client: PrismaClient | Prisma.TransactionClient = this.prismaService.getClient();
    
    const whereCondition: Prisma.PostWhereInput = {};
    
    if (by.imageId) {
      whereCondition.imageId = by.imageId;
    }
    
    if (!options.includeRemoved) {
      whereCondition.removedAt = null;
    }
    
    await client.post.updateMany({
      where: whereCondition,
      data: {
        imageId: values.imageId,
      }
    });
  }
  
  public async removePost(post: Post, options: RepositoryRemoveOptions = {}): Promise<void> {
    const client: PrismaClient | Prisma.TransactionClient = this.prismaService.getClient();
    await post.remove();
    
    if (options.disableSoftDeleting) {
      await client.post.delete({
        where: { id: post.getId() }
      });
    } else {
      const postData: Prisma.PostUpdateInput = PostMapper.toPersistenceEntity(post);
      await client.post.update({
        where: { id: post.getId() },
        data: postData
      });
    }
  }
  
}