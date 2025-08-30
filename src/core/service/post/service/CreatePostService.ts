import { Code } from '@core/common/code/Code';
import { Exception } from '@core/common/exception/Exception';
import { Optional } from '@core/common/type/CommonTypes';
import { CoreAssert } from '@core/common/util/assert/CoreAssert';
import { Media } from '@core/domain/media/entity/Media';
import { MediaRepositoryPort } from '@core/domain/media/port/persistence/MediaRepositoryPort';
import { Post } from '@core/domain/post/entity/Post';
import { PostImage } from '@core/domain/post/entity/PostImage';
import { PostOwner } from '@core/domain/post/entity/PostOwner';
import { PostRepositoryPort } from '@core/domain/post/port/persistence/PostRepositoryPort';
import { CreatePostDto } from '@core/domain/post/port/dto/CreatePostDto';
import { CreatePostInterface } from '@core/domain/post/interface/CreatePostInterface';
import { PostInterfaceDto } from '@core/domain/post/port/dto/PostInterfaceDto';
import { User } from '@core/domain/user/entity/User';
import { UserRepositoryPort } from '@core/domain/user/port/persistence/UserRepositoryPort';

export class CreatePostService implements CreatePostInterface {
  
  constructor(
    private readonly postRepository: PostRepositoryPort,
    private readonly userRepository: UserRepositoryPort,
    private readonly mediaRepository: MediaRepositoryPort,
  ) {}
  
  public async execute(payload: CreatePostDto): Promise<PostInterfaceDto> {
    const postOwner: User = CoreAssert.notEmpty(
      await this.userRepository.findUser({id: payload.executorId}),
      Exception.new({code: Code.ENTITY_NOT_FOUND_ERROR, overrideMessage: 'Post owner not found.'})
    );
    
    let postMedia: Optional<Media> = undefined;
    if (payload.imageId) {
      postMedia = await this.mediaRepository.findMedia({id: payload.imageId});
      CoreAssert.notEmpty(postMedia, Exception.new({code: Code.ENTITY_NOT_FOUND_ERROR, overrideMessage: 'Post image not found.'}));

      if (postMedia) {
        const hasAccess: boolean = postMedia.getOwnerId() === payload.executorId;
        CoreAssert.isTrue(hasAccess, Exception.new({code: Code.ACCESS_DENIED_ERROR, overrideMessage: 'Access denied to media.'}));
      }
    }
    
    const post: Post = await Post.new({
      owner  : await PostOwner.new(postOwner.getId(), postOwner.getName(), postOwner.getRole()),
      image  : postMedia ? await PostImage.new(postMedia.getId(), postMedia.getMetadata().relativePath) : null,
      title  : payload.title,
      content: payload.content,
    });
    
    await this.postRepository.addPost(post);
    
    return PostInterfaceDto.newFromPost(post);
  }
  
}
