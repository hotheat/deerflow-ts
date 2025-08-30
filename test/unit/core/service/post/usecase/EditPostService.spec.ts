import { Code } from '@core/common/code/Code';
import { MediaType } from '@core/common/enums/MediaEnums';
import { UserRole } from '@core/common/enums/UserEnums';
import { Exception } from '@core/common/exception/Exception';
import { ClassValidationDetails } from '@core/common/util/class-validator/ClassValidator';
import { Media } from '@core/domain/media/entity/Media';
import { MediaDITokens } from '@core/domain/media/di/MediaDITokens';
import { MediaRepositoryPort } from '@core/domain/media/port/persistence/MediaRepositoryPort';
import { FileMetadata } from '@core/domain/media/value-object/FileMetadata';
import { PostDITokens } from '@core/domain/post/di/PostDITokens';
import { Post } from '@core/domain/post/entity/Post';
import { PostImage } from '@core/domain/post/entity/PostImage';
import { PostOwner } from '@core/domain/post/entity/PostOwner';
import { PostRepositoryPort } from '@core/domain/post/port/persistence/PostRepositoryPort';
import { EditPostDto } from '@core/domain/post/port/dto/EditPostDto';
import { PostInterfaceDto } from '@core/domain/post/port/dto/PostInterfaceDto';
import { EditPostInterface } from '@core/domain/post/interface/EditPostInterface';
import { EditPostService } from '@core/service/post/service/EditPostService';
import { Test, TestingModule } from '@nestjs/testing';
import { v4 } from 'uuid';

describe('EditPostService', () => {
  let editPostService: EditPostInterface;
  let postRepository: PostRepositoryPort;
  let mediaRepository: MediaRepositoryPort;
  
  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: PostDITokens.EditPostInterface,
          useFactory: (postRepository, mediaRepository) => new EditPostService(postRepository, mediaRepository),
          inject: [PostDITokens.PostRepository, MediaDITokens.MediaRepository]
        },
        {
          provide: PostDITokens.PostRepository,
          useValue: {
            findPost: jest.fn(),
            updatePost: jest.fn()
          }
        },
        {
          provide: MediaDITokens.MediaRepository,
          useValue: {
            findMedia: jest.fn()
          }
        }
      ]
    }).compile();
  
    editPostService = module.get<EditPostInterface>(PostDITokens.EditPostInterface);
    postRepository = module.get<PostRepositoryPort>(PostDITokens.PostRepository);
    mediaRepository = module.get<MediaRepositoryPort>(MediaDITokens.MediaRepository);
  });
  
  describe('execute', () => {
  
    test('Expect it edits post and updates record in repository', async () => {
      const mockPost: Post = await createPost();
      const mockMedia: Media = await createMockMedia(mockPost.getOwner().getId());
  
      jest.spyOn(postRepository, 'findPost').mockImplementation(async () => mockPost);
      jest.spyOn(mediaRepository, 'findMedia').mockImplementation(async () => mockMedia);
      jest.spyOn(postRepository, 'updatePost').mockImplementation(async () => undefined);
  
      jest.spyOn(postRepository, 'updatePost').mockClear();
  
      const editPostPort: EditPostDto = {
        executorId: mockPost.getOwner().getId(),
        postId    : mockPost.getId(),
        title     : v4(),
        imageId   : mockMedia.getId(),
      };
      
      const expectedPost: Post = await Post.new({
        id       : mockPost.getId(),
        owner    : mockPost.getOwner(),
        title    : editPostPort.title!,
        image    : await createPostImage(mockMedia.getId(), mockMedia.getMetadata().relativePath),
        createdAt: mockPost.getCreatedAt()
      });
  
      const expectedPostInterfaceDto: PostInterfaceDto = await PostInterfaceDto.newFromPost(expectedPost);
  
      const resultPostInterfaceDto: PostInterfaceDto = await editPostService.execute(editPostPort);
      const resultUpdatedPost: Post = jest.spyOn(postRepository, 'updatePost').mock.calls[0][0];
  
      expect(resultPostInterfaceDto.editedAt).toBeGreaterThanOrEqual(mockPost.getEditedAt()!.getTime());
  
      expect(resultPostInterfaceDto).toEqual({...expectedPostInterfaceDto, editedAt: resultPostInterfaceDto.editedAt});
      expect(resultUpdatedPost).toEqual({...expectedPost, editedAt: resultUpdatedPost.getEditedAt()});
    });
  
    test('When post not found, expect it throws Exception', async () => {
      jest.spyOn(postRepository, 'findPost').mockImplementation(async () => undefined);
    
      expect.hasAssertions();
    
      try {
        const editPostPort: EditPostDto = {executorId: v4(), postId: v4(), title: v4()};
        await editPostService.execute(editPostPort);
      
      } catch (e) {
      
        const exception: Exception<ClassValidationDetails> = e as Exception<ClassValidationDetails>;
      
        expect(exception).toBeInstanceOf(Exception);
        expect(exception.code).toBe(Code.ENTITY_NOT_FOUND_ERROR.code);
        expect(exception.message).toBe('Post not found.');
      }
    });
  
    test('When image not found, expect it throws Exception', async () => {
      const mockPost: Post = await createPost();
      const mockMedia: Media = await createMockMedia(mockPost.getOwner().getId());
  
      jest.spyOn(postRepository, 'findPost').mockImplementation(async () => mockPost);
      jest.spyOn(mediaRepository, 'findMedia').mockImplementation(async () => undefined);
      
      expect.hasAssertions();
    
      try {
        const editPostPort: EditPostDto = {executorId: mockPost.getOwner().getId(), postId: v4(), imageId: mockMedia.getId()};
        await editPostService.execute(editPostPort);
      
      } catch (e) {
      
        const exception: Exception<ClassValidationDetails> = e as Exception<ClassValidationDetails>;
      
        expect(exception).toBeInstanceOf(Exception);
        expect(exception.code).toBe(Code.ENTITY_NOT_FOUND_ERROR.code);
        expect(exception.message).toBe('Post image not found.');
      }
    });
  
    test('When user try to update other people\'s post, expect it throws Exception', async () => {
      const mockPost: Post = await createPost();
      const executorId: string = v4();
    
      jest.spyOn(postRepository, 'findPost').mockImplementation(async () => mockPost);
    
      expect.hasAssertions();
    
      try {
        const editPostPort: EditPostDto = {executorId: executorId, postId: mockPost.getId()};
        await editPostService.execute(editPostPort);
      
      } catch (e) {
      
        const exception: Exception<ClassValidationDetails> = e as Exception<ClassValidationDetails>;
      
        expect(exception).toBeInstanceOf(Exception);
        expect(exception.code).toBe(Code.ACCESS_DENIED_ERROR.code);
      }
    });
    
  });
  
});

async function createPost(): Promise<Post> {
  return Post.new({
    owner: await PostOwner.new(v4(), v4(), UserRole.AUTHOR),
    title: 'Post title',
  });
}

async function createPostImage(customId?: string, customRelativePath?: string): Promise<PostImage> {
  const id: string = customId || v4();
  const relativePath: string = customRelativePath || '/relative/path';
  
  return PostImage.new(id, relativePath);
}

async function createMockMedia(ownerId?: string): Promise<Media> {
  return Media.new({
    id: v4(),
    ownerId: ownerId || v4(),
    name: 'test-image.png',
    type: MediaType.IMAGE,
    metadata: await FileMetadata.new({
      relativePath: '/relative/path',
      size: 1024,
      ext: 'png',
      mimetype: 'image/png'
    })
  });
}
