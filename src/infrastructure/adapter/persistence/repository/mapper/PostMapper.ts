import { Post } from '@core/domain/post/entity/Post';
import { Post as PrismaPost, PostStatus } from '@prisma/client';
import { PostOwner } from '@core/domain/post/entity/PostOwner';
import { PostImage } from '@core/domain/post/entity/PostImage';
import { UserRole } from '@core/common/enums/UserEnums';
import { PostStatus as DomainPostStatus } from '@core/common/enums/PostEnums';

export interface PostWithRelations extends PrismaPost {
  owner?: {id: string, firstName: string, lastName: string, role: UserRole};
  image?: {id: string, relativePath: string};
}

export class PostMapper {
  
  public static toDomainEntity(prismaPost: PostWithRelations): Post {
    const postOwner: PostOwner | null = prismaPost.owner 
      ? new PostOwner(
        prismaPost.owner.id,
        `${prismaPost.owner.firstName} ${prismaPost.owner.lastName}`,
        prismaPost.owner.role
      )
      : null;
    
    const postImage: PostImage | null = prismaPost.image
      ? new PostImage(prismaPost.image.id, prismaPost.image.relativePath)
      : null;
    
    if (!postOwner) {
      throw new Error('Post owner is required');
    }

    const domainPost: Post = new Post({
      owner  : postOwner,
      image  : postImage,
      title  : prismaPost.title || '',
      content: prismaPost.content || '',
      status : prismaPost.status as DomainPostStatus,
      id     : prismaPost.id,
      createdAt   : prismaPost.createdAt || new Date(),
      editedAt    : prismaPost.editedAt || undefined,
      publishedAt : prismaPost.publishedAt || undefined,
      removedAt   : prismaPost.removedAt || undefined,
    });
    
    return domainPost;
  }
  
  public static toDomainEntities(prismaPosts: PostWithRelations[]): Post[] {
    return prismaPosts.map(prismaPost => this.toDomainEntity(prismaPost));
  }
  
  public static toPersistenceEntity(domainPost: Post): Omit<PrismaPost, never> {
    return {
      id        : domainPost.getId(),
      ownerId   : domainPost.getOwner()?.getId() || null,
      title     : domainPost.getTitle(),
      imageId   : domainPost.getImage()?.getId() || null,
      content   : domainPost.getContent(),
      status    : domainPost.getStatus() as PostStatus,
      createdAt : domainPost.getCreatedAt(),
      editedAt  : domainPost.getEditedAt(),
      publishedAt : domainPost.getPublishedAt(),
      removedAt : domainPost.getRemovedAt(),
    };
  }
  
  public static toPersistenceEntities(domainPosts: Post[]): Omit<PrismaPost, never>[] {
    return domainPosts.map(domainPost => this.toPersistenceEntity(domainPost));
  }
  
}