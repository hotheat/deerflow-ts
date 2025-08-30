import { UserRole } from '@core/common/enums/UserEnums';
import { PostDITokens } from '@core/domain/post/di/PostDITokens';
import { Post } from '@core/domain/post/entity/Post';
import { PostOwner } from '@core/domain/post/entity/PostOwner';
import { PostRepositoryPort } from '@core/domain/post/port/persistence/PostRepositoryPort';
import { GetPostListDto } from '@core/domain/post/port/dto/GetPostListDto';
import { PostInterfaceDto } from '@core/domain/post/port/dto/PostInterfaceDto';
import { GetPostListInterface } from '@core/domain/post/interface/GetPostListInterface';
import { Test, TestingModule } from '@nestjs/testing';
import { v4 } from 'uuid';
import {GetPostListService} from '@core/service/post/service/GetPostListService';

describe('GetPostListService', () => {
  let getPostListService: GetPostListInterface;
  let postRepository: PostRepositoryPort;
  
  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: PostDITokens.GetPostListInterface,
          useFactory: (postRepository) => new GetPostListService(postRepository),
          inject: [PostDITokens.PostRepository]
        },
        {
          provide: PostDITokens.PostRepository,
          useValue: {
            findPosts: jest.fn(),
            countPosts: jest.fn()
          }
        }
      ]
    }).compile();
  
    getPostListService = module.get<GetPostListInterface>(PostDITokens.GetPostListInterface);
    postRepository = module.get<PostRepositoryPort>(PostDITokens.PostRepository);
  });
  
  describe('execute', () => {
  
    test('Expect it returns post list', async () => {
      const mockPost: Post = await createPost();
      
      jest.spyOn(postRepository, 'findPosts').mockImplementation(async () => [mockPost]);
      
      const expectedPostUseCaseDto: PostInterfaceDto = await PostInterfaceDto.newFromPost(mockPost);
  
      const getPostListPort: GetPostListDto = {executorId: mockPost.getOwner().getId()};
      const resultPostUseCaseDtos: PostInterfaceDto[] = await getPostListService.execute(getPostListPort);
  
      expect(resultPostUseCaseDtos.length).toBe(1);
      expect(resultPostUseCaseDtos[0]).toEqual(expectedPostUseCaseDto);
    });
    
  });
  
});

async function createPost(): Promise<Post> {
  return Post.new({
    owner : await PostOwner.new(v4(), v4(), UserRole.AUTHOR),
    title : 'Post title',
  });
}
