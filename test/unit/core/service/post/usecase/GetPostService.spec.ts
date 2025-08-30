import { Code } from '@core/common/code/Code';
import { PostStatus } from '@core/common/enums/PostEnums';
import { UserRole } from '@core/common/enums/UserEnums';
import { Exception } from '@core/common/exception/Exception';
import { ClassValidationDetails } from '@core/common/util/class-validator/ClassValidator';
import { PostDITokens } from '@core/domain/post/di/PostDITokens';
import { Post } from '@core/domain/post/entity/Post';
import { PostOwner } from '@core/domain/post/entity/PostOwner';
import { PostRepositoryPort } from '@core/domain/post/port/persistence/PostRepositoryPort';
import { GetPostDto } from '@core/domain/post/port/dto/GetPostDto';
import { PostInterfaceDto } from '@core/domain/post/port/dto/PostInterfaceDto';
import { GetPostInterface } from '@core/domain/post/interface/GetPostInterface';
import { GetPostService } from '@core/service/post/service/GetPostService';
import { Test, TestingModule } from '@nestjs/testing';
import { v4 } from 'uuid';

describe('GetPostService', () => {
  let getPostService: GetPostInterface;
  let postRepository: PostRepositoryPort;
  
  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: PostDITokens.GetPostInterface,
          useFactory: (postRepository) => new GetPostService(postRepository),
          inject: [PostDITokens.PostRepository]
        },
        {
          provide: PostDITokens.PostRepository,
          useValue: {
            findPost: jest.fn()
          }
        }
      ]
    }).compile();
  
    getPostService = module.get<GetPostInterface>(PostDITokens.GetPostInterface);
    postRepository = module.get<PostRepositoryPort>(PostDITokens.PostRepository);
  });
  
  describe('execute', () => {
  
    test('When user try to get own draft post, expect it returns post', async () => {
      const mockPost: Post = await createPost(PostStatus.DRAFT);
      
      jest.spyOn(postRepository, 'findPost').mockImplementation(async () => mockPost);
      
      const expectedPostInterfaceDto: PostInterfaceDto = await PostInterfaceDto.newFromPost(mockPost);
  
      const getPostPort: GetPostDto = {executorId: mockPost.getOwner().getId(), postId: mockPost.getId()};
      const resultPostInterfaceDto: PostInterfaceDto = await getPostService.execute(getPostPort);
      
      expect(resultPostInterfaceDto).toEqual(expectedPostInterfaceDto);
    });
  
    test('When user try to get own published post, expect it returns post', async () => {
      const mockPost: Post = await createPost(PostStatus.PUBLISHED);
    
      jest.spyOn(postRepository, 'findPost').mockImplementation(async () => mockPost);
    
      const expectedPostInterfaceDto: PostInterfaceDto = await PostInterfaceDto.newFromPost(mockPost);
    
      const getPostPort: GetPostDto = {executorId: mockPost.getOwner().getId(), postId: mockPost.getId()};
      const resultPostInterfaceDto: PostInterfaceDto = await getPostService.execute(getPostPort);
    
      expect(resultPostInterfaceDto).toEqual(expectedPostInterfaceDto);
    });
  
    test('When post not found, expect it throws Exception', async () => {
      jest.spyOn(postRepository, 'findPost').mockImplementation(async () => undefined);
      
      expect.hasAssertions();
      
      try {
        const getPostPort: GetPostDto = {executorId: v4(), postId: v4()};
        await getPostService.execute(getPostPort);
        
      } catch (e) {
  
        const exception: Exception<ClassValidationDetails> = e as Exception<ClassValidationDetails>;
  
        expect(exception).toBeInstanceOf(Exception);
        expect(exception.code).toBe(Code.ENTITY_NOT_FOUND_ERROR.code);
      }
    });
  
    test('When user try to get other people\'s published post, expect it returns post', async () => {
      const mockPost: Post = await createPost(PostStatus.PUBLISHED);
    
      jest.spyOn(postRepository, 'findPost').mockImplementation(async () => mockPost);
    
      const expectedPostInterfaceDto: PostInterfaceDto = await PostInterfaceDto.newFromPost(mockPost);
    
      const getPostPort: GetPostDto = {executorId: v4(), postId: mockPost.getId()};
      const resultPostInterfaceDto: PostInterfaceDto = await getPostService.execute(getPostPort);
    
      expect(resultPostInterfaceDto).toEqual(expectedPostInterfaceDto);
    });
  
    test('When user try to get other people\'s draft post, expect it throws Exception', async () => {
      const mockPost: Post = await createPost(PostStatus.DRAFT);

      jest.spyOn(postRepository, 'findPost').mockImplementation(async () => mockPost);
    
      expect.hasAssertions();
    
      try {
        const getPostPort: GetPostDto = {executorId: v4(), postId: v4()};
        await getPostService.execute(getPostPort);
      
      } catch (e) {
      
        const exception: Exception<ClassValidationDetails> = e as Exception<ClassValidationDetails>;
      
        expect(exception).toBeInstanceOf(Exception);
        expect(exception.code).toBe(Code.ACCESS_DENIED_ERROR.code);
      }
    });
    
  });
  
});

async function createPost(staus: PostStatus): Promise<Post> {
  return Post.new({
    owner : await PostOwner.new(v4(), v4(), UserRole.AUTHOR),
    title : 'Post title',
    status: staus
  });
}
