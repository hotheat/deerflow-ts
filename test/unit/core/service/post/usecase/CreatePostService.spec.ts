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
import { CreatePostDto } from '@core/domain/post/port/dto/CreatePostDto';
import { CreatePostInterface } from '@core/domain/post/interface/CreatePostInterface';
import { PostInterfaceDto } from '@core/domain/post/port/dto/PostInterfaceDto';
import { User } from '@core/domain/user/entity/User';
import { UserDITokens } from '@core/domain/user/di/UserDITokens';
import { UserRepositoryPort } from '@core/domain/user/port/persistence/UserRepositoryPort';
import { CreatePostService } from '@core/service/post/service/CreatePostService';
import { Test, TestingModule } from '@nestjs/testing';
import { v4 } from 'uuid';

describe('CreatePostService', () => {
  let createPostService: CreatePostInterface;
  let postRepository: PostRepositoryPort;
  let userRepository: UserRepositoryPort;
  let mediaRepository: MediaRepositoryPort;
  
  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: PostDITokens.CreatePostInterface,
          useFactory: (postRepository, userRepository, mediaRepository) => new CreatePostService(postRepository, userRepository, mediaRepository),
          inject: [PostDITokens.PostRepository, UserDITokens.UserRepository, MediaDITokens.MediaRepository]
        },
        {
          provide: PostDITokens.PostRepository,
          useValue: {
            addPost: jest.fn()
          }
        },
        {
          provide: UserDITokens.UserRepository,
          useValue: {
            findUser: jest.fn()
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
  
    createPostService = module.get<CreatePostInterface>(PostDITokens.CreatePostInterface);
    postRepository = module.get<PostRepositoryPort>(PostDITokens.PostRepository);
    userRepository = module.get<UserRepositoryPort>(UserDITokens.UserRepository);
    mediaRepository = module.get<MediaRepositoryPort>(MediaDITokens.MediaRepository);
  });
  
  describe('execute', () => {
  
    test('Expect it creates post', async () => {
      const mockPostId: string = v4();
      const mockUser: User = await createMockUser();
      const mockMedia: Media = await createMockMedia(mockUser.getId());
      
      jest.spyOn(userRepository, 'findUser').mockResolvedValueOnce(mockUser);
      jest.spyOn(mediaRepository, 'findMedia').mockResolvedValueOnce(mockMedia);
      jest.spyOn(postRepository, 'addPost').mockResolvedValueOnce({id: mockPostId});
  
      const createPostPort: CreatePostDto = {
        executorId: mockUser.getId(),
        title     : v4(),
        imageId   : mockMedia.getId(),
      };
      
      const expectedPost: Post = await Post.new({
        id   : mockPostId,
        owner: await createPostOwner(mockUser.getId(), mockUser.getName()),
        title: createPostPort.title,
        image: await createPostImage(mockMedia.getId(), mockMedia.getMetadata().relativePath),
      });
  
      const expectedPostInterfaceDto: PostInterfaceDto = await PostInterfaceDto.newFromPost(expectedPost);
      
      const resultPostInterfaceDto: PostInterfaceDto = await createPostService.execute(createPostPort);
      Reflect.set(resultPostInterfaceDto, 'id', expectedPostInterfaceDto.id);
      Reflect.set(resultPostInterfaceDto, 'createdAt', expectedPostInterfaceDto.createdAt);
      
      const resultAddedPost: Post = jest.spyOn(postRepository, 'addPost').mock.calls[0][0];
      Reflect.set(resultAddedPost, 'id', expectedPost.getId());
      Reflect.set(resultAddedPost, 'createdAt', expectedPost.getCreatedAt());
      
      expect(resultPostInterfaceDto).toEqual(expectedPostInterfaceDto);
      expect(resultAddedPost).toEqual(expectedPost);
    });
  
    test('When owner not found, expect it throws Exception', async () => {
      jest.spyOn(userRepository, 'findUser').mockResolvedValueOnce(undefined);
    
      expect.hasAssertions();
  
      try {
        const createPostPort: CreatePostDto = {executorId: v4(), title: v4()};
        await createPostService.execute(createPostPort);
    
      } catch (e) {
    
        const exception: Exception<ClassValidationDetails> = e as Exception<ClassValidationDetails>;
    
        expect(exception).toBeInstanceOf(Exception);
        expect(exception.code).toBe(Code.ENTITY_NOT_FOUND_ERROR.code);
        expect(exception.message).toBe('Post owner not found.');
      }
    });
  
    test('When image not found, expect it throws Exception', async () => {
      const mockUser: User = await createMockUser();
  
      jest.spyOn(userRepository, 'findUser').mockResolvedValueOnce(mockUser);
      jest.spyOn(mediaRepository, 'findMedia').mockResolvedValueOnce(undefined);
    
      expect.hasAssertions();
    
      try {
        const createPostPort: CreatePostDto = {executorId: mockUser.getId(), title: v4(), imageId: v4()};
        await createPostService.execute(createPostPort);
      
      } catch (e) {
      
        const exception: Exception<ClassValidationDetails> = e as Exception<ClassValidationDetails>;
      
        expect(exception).toBeInstanceOf(Exception);
        expect(exception.code).toBe(Code.ENTITY_NOT_FOUND_ERROR.code);
        expect(exception.message).toBe('Post image not found.');
      }
    });

    test('When user has no access to media, expect it throws Exception', async () => {
      const mockUser: User = await createMockUser();
      const mockMedia: Media = await createMockMedia();
  
      jest.spyOn(userRepository, 'findUser').mockResolvedValueOnce(mockUser);
      jest.spyOn(mediaRepository, 'findMedia').mockResolvedValueOnce(mockMedia);
    
      expect.hasAssertions();
    
      try {
        const createPostPort: CreatePostDto = {executorId: v4(), title: v4(), imageId: mockMedia.getId()};
        await createPostService.execute(createPostPort);
      
      } catch (e) {
      
        const exception: Exception<ClassValidationDetails> = e as Exception<ClassValidationDetails>;
      
        expect(exception).toBeInstanceOf(Exception);
        expect(exception.code).toBe(Code.ACCESS_DENIED_ERROR.code);
        expect(exception.message).toBe('Access denied to media.');
      }
    });
    
  });
  
});

async function createPostOwner(customId?: string, customName?: string): Promise<PostOwner> {
  const id: string = customId || v4();
  const name: string = customName || v4();
  const role: UserRole = UserRole.AUTHOR;
  
  return PostOwner.new(id, name, role);
}

async function createMockUser(): Promise<User> {
  return User.new({
    id: v4(),
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com',
    role: UserRole.AUTHOR,
    password: 'password123'
  });
}

async function createPostImage(customId?: string, customRelativePath?: string): Promise<PostImage> {
  const id: string = customId || v4();
  const relativePath: string = customRelativePath || '/relative/path';
  
  return PostImage.new(id, relativePath);
}

async function createMockMedia(ownerId?: string): Promise<Media> {
  const metadata: FileMetadata = await FileMetadata.new({
    relativePath: '/relative/path',
    size: 1024,
    ext: 'jpg',
    mimetype: 'image/jpeg'
  });
  
  return Media.new({
    id: v4(),
    ownerId: ownerId || v4(),
    name: 'Test Image',
    type: MediaType.IMAGE,
    metadata: metadata
  });
}