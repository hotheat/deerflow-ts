import { Code } from '@core/common/code/Code';
import { Exception } from '@core/common/exception/Exception';
import { CoreAssert } from '@core/common/util/assert/CoreAssert';
import { Post } from '@core/domain/post/entity/Post';
import { PostRepositoryPort } from '@core/domain/post/port/persistence/PostRepositoryPort';
import { RemovePostDto } from '@core/domain/post/port/dto/RemovePostDto';
import { RemovePostInterface } from '@core/domain/post/interface/RemovePostInterface';

export class RemovePostService implements RemovePostInterface {
  
  constructor(
    private readonly postRepository: PostRepositoryPort,
  ) {}
  
  public async execute(payload: RemovePostDto): Promise<void> {
    const post: Post = CoreAssert.notEmpty(
      await this.postRepository.findPost({id: payload.postId}),
      Exception.new({code: Code.ENTITY_NOT_FOUND_ERROR, overrideMessage: 'Post not found.'})
    );
  
    const hasAccess: boolean = payload.executorId === post.getOwner().getId();
    CoreAssert.isTrue(hasAccess, Exception.new({code: Code.ACCESS_DENIED_ERROR}));
    
    await this.postRepository.removePost(post);
  }
  
}
