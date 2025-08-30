import { HttpAuth } from '@application/api/http-rest/auth/decorator/HttpAuth';
import { HttpUser } from '@application/api/http-rest/auth/decorator/HttpUser';
import { HttpRequestWithUser, HttpUserPayload } from '@application/api/http-rest/auth/type/HttpAuthTypes';
import { HttpRestApiModelCreateMediaBody } from '@application/api/http-rest/controller/documentation/media/HttpRestApiModelCreateMediaBody';
import { HttpRestApiModelCreateMediaQuery } from '@application/api/http-rest/controller/documentation/media/HttpRestApiModelCreateMediaQuery';
import { HttpRestApiModelEditMediaBody } from '@application/api/http-rest/controller/documentation/media/HttpRestApiModelEditMediaBody';
import { HttpRestApiResponseMedia } from '@application/api/http-rest/controller/documentation/media/HttpRestApiResponseMedia';
import { HttpRestApiResponseMediaList } from '@application/api/http-rest/controller/documentation/media/HttpRestApiResponseMediaList';
import { CoreApiResponse } from '@core/common/api/CoreApiResponse';
import { MediaType } from '@core/common/enums/MediaEnums';
import { UserRole } from '@core/common/enums/UserEnums';
import { MediaDITokens } from '@core/domain/media/di/MediaDITokens';
import { CreateMediaInterface } from '@core/domain/media/interface/CreateMediaInterface';
import { MediaInterfaceDto } from '@core/domain/media/port/dto/MediaInterfaceDto';
import { EditMediaInterface } from '@core/domain/media/interface/EditMediaInterface';
import { GetMediaListInterface } from '@core/domain/media/interface/GetMediaListInterface';
import { GetMediaInterface } from '@core/domain/media/interface/GetMediaInterface';
import { RemoveMediaInterface } from '@core/domain/media/interface/RemoveMediaInterface';
import { CreateMediaValidator } from '@infrastructure/adapter/validator/media/CreateMediaValidator';
import { EditMediaValidator } from '@infrastructure/adapter/validator/media/EditMediaValidator';
import { GetMediaValidator } from '@infrastructure/adapter/validator/media/GetMediaValidator';
import { GetMediaListValidator } from '@infrastructure/adapter/validator/media/GetMediaListValidator';
import { RemoveMediaValidator } from '@infrastructure/adapter/validator/media/RemoveMediaValidator';
import { FileStorageConfig } from '@infrastructure/config/FileStorageConfig';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  Put,
  Query,
  Req,
  UploadedFile,
  UseInterceptors
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { parse } from 'path';
import { resolve } from 'url';

@Controller('medias')
@ApiTags('medias')
export class MediaController {
  
  constructor(
    @Inject(MediaDITokens.CreateMediaInterface)
    private readonly createMediaInterface: CreateMediaInterface,
    
    @Inject(MediaDITokens.EditMediaInterface)
    private readonly editMediaInterface: EditMediaInterface,
    
    @Inject(MediaDITokens.GetMediaListInterface)
    private readonly getMediaListInterface: GetMediaListInterface,
    
    @Inject(MediaDITokens.GetMediaInterface)
    private readonly getMediaInterface: GetMediaInterface,
    
    @Inject(MediaDITokens.RemoveMediaInterface)
    private readonly removeMediaInterface: RemoveMediaInterface,
  ) {}
  
  @Post()
  @HttpAuth(UserRole.ADMIN, UserRole.AUTHOR)
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiBody({type: HttpRestApiModelCreateMediaBody})
  @ApiQuery({name: 'name', type: 'string', required: false})
  @ApiQuery({name: 'type', enum: MediaType})
  @ApiResponse({status: HttpStatus.OK, type: HttpRestApiResponseMedia})
  public async createMedia(
    @Req() request: HttpRequestWithUser,
    @UploadedFile() file: MulterFile,
    @Query() query: HttpRestApiModelCreateMediaQuery
    
  ): Promise<CoreApiResponse<MediaInterfaceDto>> {
  
    const adapter: CreateMediaValidator = await CreateMediaValidator.new({
      executorId: request.user.id,
      name      : query.name || parse(file.originalname).name,
      type      : query.type,
      file      : file.buffer,
    });
    
    const createdMedia: MediaInterfaceDto = await this.createMediaInterface.execute(adapter);
    this.setFileStorageBasePath([createdMedia]);
    
    return CoreApiResponse.success(createdMedia);
  }
  
  @Put(':mediaId')
  @HttpAuth(UserRole.ADMIN, UserRole.AUTHOR)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiBody({type: HttpRestApiModelEditMediaBody})
  @ApiResponse({status: HttpStatus.OK, type: HttpRestApiResponseMedia})
  public async editMedia(
    @HttpUser() user: HttpUserPayload,
    @Body() body: HttpRestApiModelEditMediaBody,
    @Param('mediaId') mediaId: string
    
  ): Promise<CoreApiResponse<MediaInterfaceDto>> {
    
    const adapter: EditMediaValidator = await EditMediaValidator.new({
      mediaId    : mediaId,
      executorId : user.id,
      name       : body.name,
    });
    
    const editedMedia: MediaInterfaceDto = await this.editMediaInterface.execute(adapter);
    this.setFileStorageBasePath([editedMedia]);
    
    return CoreApiResponse.success(editedMedia);
  }
  
  @Get()
  @HttpAuth(UserRole.ADMIN, UserRole.AUTHOR)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiResponse({status: HttpStatus.OK, type: HttpRestApiResponseMediaList})
  public async getMediaList(@HttpUser() user: HttpUserPayload): Promise<CoreApiResponse<MediaInterfaceDto[]>> {
    const adapter: GetMediaListValidator = await GetMediaListValidator.new({executorId: user.id});
    const medias: MediaInterfaceDto[] = await this.getMediaListInterface.execute(adapter);
    this.setFileStorageBasePath(medias);
    
    return CoreApiResponse.success(medias);
  }
  
  @Get(':mediaId')
  @HttpAuth(UserRole.ADMIN, UserRole.AUTHOR)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiResponse({status: HttpStatus.OK, type: HttpRestApiResponseMedia})
  public async getMedia(@HttpUser() user: HttpUserPayload, @Param('mediaId') mediaId: string): Promise<CoreApiResponse<MediaInterfaceDto>> {
    const adapter: GetMediaValidator = await GetMediaValidator.new({executorId: user.id, mediaId: mediaId,});
    const media: MediaInterfaceDto = await this.getMediaInterface.execute(adapter);
    this.setFileStorageBasePath([media]);
    
    return CoreApiResponse.success(media);
  }
  
  @Delete(':mediaId')
  @HttpAuth(UserRole.ADMIN, UserRole.AUTHOR)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiResponse({status: HttpStatus.OK, type: HttpRestApiResponseMedia})
  public async removeMedia(@HttpUser() user: HttpUserPayload, @Param('mediaId') mediaId: string): Promise<CoreApiResponse<void>> {
    const adapter: RemoveMediaValidator = await RemoveMediaValidator.new({executorId: user.id, mediaId: mediaId,});
    await this.removeMediaInterface.execute(adapter);
    
    return CoreApiResponse.success();
  }
  
  private setFileStorageBasePath(medias: MediaInterfaceDto[]): void {
    medias.forEach((media: MediaInterfaceDto) => media.url = resolve(FileStorageConfig.BASE_PATH, media.url));
  }
  
}

type MulterFile = { originalname: string, mimetype: string, size: number, buffer: Buffer };