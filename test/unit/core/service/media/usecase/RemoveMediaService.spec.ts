import { Code } from '@core/common/code/Code';
import { MediaType } from '@core/common/enums/MediaEnums';
import { Exception } from '@core/common/exception/Exception';
import { ClassValidationDetails } from '@core/common/util/class-validator/ClassValidator';
import { MediaDITokens } from '@core/domain/media/di/MediaDITokens';
import { Media } from '@core/domain/media/entity/Media';
import { MediaRepositoryPort } from '@core/domain/media/port/persistence/MediaRepositoryPort';
import { RemoveMediaPort } from '@core/domain/media/port/usecase/RemoveMediaPort';
import { RemoveMediaUseCase } from '@core/domain/media/usecase/RemoveMediaUseCase';
import { FileMetadata } from '@core/domain/media/value-object/FileMetadata';
import { PostDITokens } from '@core/domain/post/di/PostDITokens';
import { PostRepositoryPort } from '@core/domain/post/port/persistence/PostRepositoryPort';
import { RemoveMediaService } from '@core/service/media/usecase/RemoveMediaService';
import { Test, TestingModule } from '@nestjs/testing';
import { v4 } from 'uuid';

describe('RemoveMediaService', () => {
  let removeMediaService: RemoveMediaUseCase;
  let mediaRepository: MediaRepositoryPort;
  let postRepository: PostRepositoryPort;
  
  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: MediaDITokens.RemoveMediaUseCase,
          useFactory: (mediaRepository, postRepository) => new RemoveMediaService(mediaRepository, postRepository),
          inject: [MediaDITokens.MediaRepository, PostDITokens.PostRepository]
        },
        {
          provide: MediaDITokens.MediaRepository,
          useValue: {
            findMedia: jest.fn(),
            removeMedia: jest.fn()
          }
        },
        {
          provide: PostDITokens.PostRepository,
          useValue: {
            updatePosts: jest.fn()
          }
        }
      ]
    }).compile();
  
    removeMediaService = module.get<RemoveMediaUseCase>(MediaDITokens.RemoveMediaUseCase);
    mediaRepository = module.get<MediaRepositoryPort>(MediaDITokens.MediaRepository);
    postRepository = module.get<PostRepositoryPort>(PostDITokens.PostRepository);
  });
  
  describe('execute', () => {
  
    test('Expect it removes media and updates related posts', async () => {
      const mockMedia: Media = await createMedia();
      
      jest.spyOn(mediaRepository, 'findMedia').mockImplementation(async () => mockMedia);
      jest.spyOn(mediaRepository, 'removeMedia').mockImplementation(async () => undefined);
      jest.spyOn(postRepository, 'updatePosts').mockImplementation(async () => undefined);
      
      jest.spyOn(mediaRepository, 'removeMedia').mockClear();
      jest.spyOn(postRepository, 'updatePosts').mockClear();
  
      const removeMediaPort: RemoveMediaPort = {
        executorId: mockMedia.getOwnerId(),
        mediaId   : mockMedia.getId(),
      };
      
      await removeMediaService.execute(removeMediaPort);
      
      const removedMedia: Media = jest.spyOn(mediaRepository, 'removeMedia').mock.calls[0][0];
      const updatePostsCall = jest.spyOn(postRepository, 'updatePosts').mock.calls[0];
      
      expect(removedMedia).toEqual(mockMedia);
      expect(updatePostsCall[0]).toEqual({imageId: null});
      expect(updatePostsCall[1]).toEqual({imageId: mockMedia.getId()});
      
    });
  
    test('When media not found, expect it throws Exception', async () => {
      jest.spyOn(mediaRepository, 'findMedia').mockImplementation(async () => undefined);
      
      expect.hasAssertions();
      
      try {
        const removeMediaPort: RemoveMediaPort = {executorId: v4(), mediaId: v4()};
        await removeMediaService.execute(removeMediaPort);
        
      } catch (e) {
  
        const exception: Exception<ClassValidationDetails> = e as Exception<ClassValidationDetails>;
  
        expect(exception).toBeInstanceOf(Exception);
        expect(exception.code).toBe(Code.ENTITY_NOT_FOUND_ERROR.code);
      }
    });
  
    test('When user try to remove other people\'s media, expect it throws Exception', async () => {
      const mockMedia: Media = await createMedia();
      const executorId: string = v4();
    
      jest.spyOn(mediaRepository, 'findMedia').mockImplementation(async () => mockMedia);
    
      expect.hasAssertions();
    
      try {
        const removeMediaPort: RemoveMediaPort = {executorId: executorId, mediaId: mockMedia.getId()};
        await removeMediaService.execute(removeMediaPort);
      
      } catch (e) {
      
        const exception: Exception<ClassValidationDetails> = e as Exception<ClassValidationDetails>;
      
        expect(exception).toBeInstanceOf(Exception);
        expect(exception.code).toBe(Code.ACCESS_DENIED_ERROR.code);
      }
    });
    
  });
  
});

async function createMedia(): Promise<Media> {
  const metadata: FileMetadata = await FileMetadata.new({
    relativePath: '/relative/path',
    size        : 10_000_000,
    ext         : 'png',
    mimetype    : 'image/png'
  });
  
  return Media.new({
    ownerId : v4(),
    name    : v4(),
    type    : MediaType.IMAGE,
    metadata: metadata,
    removedAt: new Date()
  });
}
