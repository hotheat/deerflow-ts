import { PostStatus } from '@core/common/enums/PostEnums';
import { UserRole } from '@core/common/enums/UserEnums';
import { Post } from '@core/domain/post/entity/Post';
import { PostImage } from '@core/domain/post/entity/PostImage';
import { PostOwner } from '@core/domain/post/entity/PostOwner';
import { PostInterfaceDto } from '@core/domain/post/port/dto/PostInterfaceDto';
import { v4 } from 'uuid';

describe('PostInterfaceDto', () => {

  describe('newFromPost', () => {
  
    test('Expect it creates PostInterfaceDto instance with required parameters', async () => {
      const post: Post = await createPost();
      const postInterfaceDto: PostInterfaceDto = PostInterfaceDto.newFromPost(post);
      
      const expectedOwner: Record<string, unknown> = {
        id  : post.getOwner().getId(),
        name: post.getOwner().getName(),
        role: post.getOwner().getRole()
      };
  
      const expectedImage: Record<string, unknown> = {
        id : post.getImage()!.getId(),
        url: post.getImage()!.getRelativePath(),
      };
  
      expect(postInterfaceDto.id).toBe(post.getId());
      expect(postInterfaceDto.owner).toEqual(expectedOwner);
      expect(postInterfaceDto.image).toEqual(expectedImage);
      expect(postInterfaceDto.title).toBe(post.getTitle());
      expect(postInterfaceDto.content).toBe(post.getContent());
      expect(postInterfaceDto.status).toBe(post.getStatus());
      expect(postInterfaceDto.createdAt).toBe(post.getCreatedAt().getTime());
      expect(postInterfaceDto.publishedAt).toBe(post.getPublishedAt()?.getTime());
      expect(postInterfaceDto.editedAt).toBe(post.getEditedAt()?.getTime());
    });
    
  });
  
  describe('newListFromPosts', () => {
    
    test('Expect it creates PostInterfaceDto instances with required parameters', async () => {
      const post: Post = await createPost();
      const postInterfaceDtos: PostInterfaceDto[] = PostInterfaceDto.newListFromPosts([post]);
  
      const expectedOwner: Record<string, unknown> = {
        id  : post.getOwner().getId(),
        name: post.getOwner().getName(),
        role: post.getOwner().getRole()
      };
  
      const expectedImage: Record<string, unknown> = {
        id : post.getImage()!.getId(),
        url: post.getImage()!.getRelativePath(),
      };
  
      expect(postInterfaceDtos.length).toBe(1);
      expect(postInterfaceDtos[0].id).toBe(post.getId());
      expect(postInterfaceDtos[0].owner).toEqual(expectedOwner);
      expect(postInterfaceDtos[0].image).toEqual(expectedImage);
      expect(postInterfaceDtos[0].title).toBe(post.getTitle());
      expect(postInterfaceDtos[0].content).toBe(post.getContent());
      expect(postInterfaceDtos[0].status).toBe(post.getStatus());
      expect(postInterfaceDtos[0].createdAt).toBe(post.getCreatedAt().getTime());
      expect(postInterfaceDtos[0].publishedAt).toBe(post.getPublishedAt()?.getTime());
      expect(postInterfaceDtos[0].editedAt).toBe(post.getEditedAt()?.getTime());
    });
    
  });
  
});

async function createPost(): Promise<Post> {
  return Post.new({
    owner      : await PostOwner.new(v4(), v4(), UserRole.AUTHOR),
    title      : v4(),
    image      : await PostImage.new(v4(), '/relative/path'),
    content    : v4(),
    status     : PostStatus.PUBLISHED,
    editedAt   : new Date(),
    publishedAt: new Date(),
  });
}
