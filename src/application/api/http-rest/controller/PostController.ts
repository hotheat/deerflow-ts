import { HttpAuth } from '@application/api/http-rest/auth/decorator/HttpAuth';
import { HttpUser } from '@application/api/http-rest/auth/decorator/HttpUser';
import { HttpUserPayload } from '@application/api/http-rest/auth/type/HttpAuthTypes';
import { HttpRestApiModelCreatePostBody } from '@application/api/http-rest/controller/documentation/post/HttpRestApiModelCreatePostBody';
import { HttpRestApiModelEditPostBody } from '@application/api/http-rest/controller/documentation/post/HttpRestApiModelEditPostBody';
import { HttpRestApiModelGetPostListQuery } from '@application/api/http-rest/controller/documentation/post/HttpRestApiModelGetPostListQuery';
import { HttpRestApiResponsePost } from '@application/api/http-rest/controller/documentation/post/HttpRestApiResponsePost';
import { HttpRestApiResponsePostList } from '@application/api/http-rest/controller/documentation/post/HttpRestApiResponsePostList';
import { CoreApiResponse } from '@core/common/api/CoreApiResponse';
import { PostStatus } from '@core/common/enums/PostEnums';
import { UserRole } from '@core/common/enums/UserEnums';
import { PostDITokens } from '@core/domain/post/di/PostDITokens';
import { CreatePostInterface } from '@core/domain/post/interface/CreatePostInterface';
import { PostInterfaceDto } from '@core/domain/post/port/dto/PostInterfaceDto';
import { EditPostInterface } from '@core/domain/post/interface/EditPostInterface';
import { GetPostListInterface } from '@core/domain/post/interface/GetPostListInterface';
import { GetPostInterface } from '@core/domain/post/interface/GetPostInterface';
import { PublishPostInterface } from '@core/domain/post/interface/PublishPostInterface';
import { RemovePostInterface } from '@core/domain/post/interface/RemovePostInterface';
import { CreatePostValidator } from '@infrastructure/adapter/validator/post/CreatePostValidator';
import { EditPostValidator } from '@infrastructure/adapter/validator/post/EditPostValidator';
import { GetPostValidator } from '@infrastructure/adapter/validator/post/GetPostValidator';
import { GetPostListValidator } from '@infrastructure/adapter/validator/post/GetPostListValidator';
import { PublishPostValidator } from '@infrastructure/adapter/validator/post/PublishPostValidator';
import { RemovePostValidator } from '@infrastructure/adapter/validator/post/RemovePostValidator';
import { FileStorageConfig } from '@infrastructure/config/FileStorageConfig';
import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Inject, Param, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { resolve } from 'url';

@Controller('posts')
@ApiTags('posts')
export class PostController {
  
  constructor(
    @Inject(PostDITokens.CreatePostInterface)
    private readonly createPostInterface: CreatePostInterface,

    @Inject(PostDITokens.EditPostInterface)
    private readonly editPostInterface: EditPostInterface,

    @Inject(PostDITokens.GetPostListInterface)
    private readonly getPostListInterface: GetPostListInterface,

    @Inject(PostDITokens.GetPostInterface)
    private readonly getPostInterface: GetPostInterface,

    @Inject(PostDITokens.PublishPostInterface)
    private readonly publishPostInterface: PublishPostInterface,

    @Inject(PostDITokens.RemovePostInterface)
    private readonly removePostInterface: RemovePostInterface,
  ) {}
  
  @Post()
  @HttpAuth(UserRole.AUTHOR)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiBody({type: HttpRestApiModelCreatePostBody})
  @ApiResponse({status: HttpStatus.OK, type: HttpRestApiResponsePost})
  public async createPost(@HttpUser() user: HttpUserPayload, @Body() body: HttpRestApiModelCreatePostBody): Promise<CoreApiResponse<PostInterfaceDto>> {
    const adapter: CreatePostValidator = await CreatePostValidator.new({
      executorId: user.id,
      title     : body.title,
      imageId   : body.imageId,
      content   : body.content,
    });
    
    const createdPost: PostInterfaceDto = await this.createPostInterface.execute(adapter);
    this.setFileStorageBasePath([createdPost]);
    
    return CoreApiResponse.success(createdPost);
  }
  
  @Put(':postId')
  @HttpAuth(UserRole.AUTHOR)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiBody({type: HttpRestApiModelEditPostBody})
  @ApiResponse({status: HttpStatus.OK, type: HttpRestApiResponsePost})
  public async editPost(
    @HttpUser() user: HttpUserPayload,
    @Body() body: HttpRestApiModelCreatePostBody,
    @Param('postId') postId: string
    
  ): Promise<CoreApiResponse<PostInterfaceDto>> {
    
    const adapter: EditPostValidator = await EditPostValidator.new({
      executorId: user.id,
      postId    : postId,
      title     : body.title,
      content   : body.content,
      imageId   : body.imageId,
    });
    
    const editedPost: PostInterfaceDto = await this.editPostInterface.execute(adapter);
    this.setFileStorageBasePath([editedPost]);
    
    return CoreApiResponse.success(editedPost);
  }
  
  @Get()
  @HttpAuth(UserRole.AUTHOR, UserRole.ADMIN, UserRole.GUEST)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiQuery({name: 'authorId', type: 'string', required: false})
  @ApiResponse({status: HttpStatus.OK, type: HttpRestApiResponsePostList})
  public async getPostList(
    @HttpUser() user: HttpUserPayload,
    @Query() query: HttpRestApiModelGetPostListQuery
    
  ): Promise<CoreApiResponse<PostInterfaceDto[]>> {
    
    const adapter: GetPostListValidator = await GetPostListValidator.new({
      executorId: user.id,
      ownerId: query.authorId,
      status: PostStatus.PUBLISHED
    });
    const posts: PostInterfaceDto[] = await this.getPostListInterface.execute(adapter);
    this.setFileStorageBasePath(posts);
    
    return CoreApiResponse.success(posts);
  }
  
  @Get('mine')
  @HttpAuth(UserRole.AUTHOR)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiResponse({status: HttpStatus.OK, type: HttpRestApiResponsePostList})
  public async getMinePostList(@HttpUser() user: HttpUserPayload): Promise<CoreApiResponse<PostInterfaceDto[]>> {
    const adapter: GetPostListValidator = await GetPostListValidator.new({
      executorId: user.id,
      ownerId: user.id,
    });
    const posts: PostInterfaceDto[] = await this.getPostListInterface.execute(adapter);
    this.setFileStorageBasePath(posts);
    
    return CoreApiResponse.success(posts);
  }
  
  @Get(':postId')
  @HttpAuth(UserRole.AUTHOR, UserRole.ADMIN, UserRole.GUEST)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiResponse({status: HttpStatus.OK, type: HttpRestApiResponsePostList})
  public async getPost(@HttpUser() user: HttpUserPayload, @Param('postId') postId: string): Promise<CoreApiResponse<PostInterfaceDto>> {
    const adapter: GetPostValidator = await GetPostValidator.new({executorId: user.id, postId: postId});
    const post: PostInterfaceDto = await this.getPostInterface.execute(adapter);
    this.setFileStorageBasePath([post]);
    
    return CoreApiResponse.success(post);
  }
  
  @Post(':postId/publish')
  @HttpAuth(UserRole.AUTHOR)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiResponse({status: HttpStatus.OK, type: HttpRestApiResponsePostList})
  public async publishPost(@HttpUser() user: HttpUserPayload, @Param('postId') postId: string): Promise<CoreApiResponse<PostInterfaceDto>> {
    const adapter: PublishPostValidator = await PublishPostValidator.new({executorId: user.id, postId: postId});
    const post: PostInterfaceDto = await this.publishPostInterface.execute(adapter);
    this.setFileStorageBasePath([post]);
    
    return CoreApiResponse.success(post);
  }
  
  @Delete(':postId')
  @HttpAuth(UserRole.AUTHOR)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiResponse({status: HttpStatus.OK, type: HttpRestApiResponsePostList})
  public async removePost(@HttpUser() user: HttpUserPayload, @Param('postId') postId: string): Promise<CoreApiResponse<void>> {
    const adapter: RemovePostValidator = await RemovePostValidator.new({executorId: user.id, postId: postId});
    await this.removePostInterface.execute(adapter);
    
    return CoreApiResponse.success();
  }
  
  private setFileStorageBasePath(posts: PostInterfaceDto[]): void {
    posts.forEach((post: PostInterfaceDto) => {
      if (post.image) {
        post.image.url = resolve(FileStorageConfig.BASE_PATH, post.image.url);
      }
    });
  }
  
}
