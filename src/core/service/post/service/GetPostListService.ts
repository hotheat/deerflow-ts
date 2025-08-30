import { Post } from '@core/domain/post/entity/Post';
import { PostRepositoryPort } from '@core/domain/post/port/persistence/PostRepositoryPort';
import { GetPostListDto } from '@core/domain/post/port/dto/GetPostListDto';
import { PostInterfaceDto } from '@core/domain/post/port/dto/PostInterfaceDto';
import { GetPostListInterface } from '@core/domain/post/interface/GetPostListInterface';

export class GetPostListService implements GetPostListInterface {
  
  constructor(
    private readonly postRepository: PostRepositoryPort,
  ) {}
  
  public async execute(payload: GetPostListDto): Promise<PostInterfaceDto[]> {
    const posts: Post[] = await this.postRepository.findPosts({
      ownerId: payload.ownerId,
      status: payload.status,
    });
    
    return PostInterfaceDto.newListFromPosts(posts);
  }
  
}
