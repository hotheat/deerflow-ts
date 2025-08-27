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
          inject: ['MediaRepository', 'PostRepository']
        },
        {
          provide: 'MediaRepository',
          useValue: {
            findMedia: jest.fn(),
            removeMedia: jest.fn()
          }
        },
        {
          provide: 'PostRepository',
          useValue: {
            updatePosts: jest.fn()
          }
        }
      ]
    }).compile();
  
    removeMediaService = module.get<RemoveMediaUseCase>(MediaDITokens.RemoveMediaUseCase);
    mediaRepository = module.get<MediaRepositoryPort>('MediaRepository');
    postRepository = module.get<PostRepositoryPort>('PostRepository');
  });
  
  describe('execute', () => {
  
    test('Expect it removes media and sends event about it', async () => {
      const mockMedia: Media = await createMedia();
      
      jest.spyOn(mediaRepository, 'findMedia').mockImplementation(async () => mockMedia);
      jest.spyOn(mediaRepository, 'removeMedia').mockImplementation(async () => undefined);
      jest.spyOn(eventBus, 'sendEvent').mockImplementation(async () => undefined);
      
      jest.spyOn(mediaRepository, 'removeMedia').mockClear();
      jest.spyOn(eventBus, 'sendEvent').mockClear();
  
      const removeMediaPort: RemoveMediaPort = {
        executorId: mockMedia.getOwnerId(),
        mediaId   : mockMedia.getId(),
      };
      
      await removeMediaService.execute(removeMediaPort);
      
      const removedMedia: Media = jest.spyOn(mediaRepository, 'removeMedia').mock.calls[0][0];
      const mediaRemovedEvent: MediaRemovedEvent = jest.spyOn(eventBus, 'sendEvent').mock.calls[0][0] as MediaRemovedEvent;
      
      expect(removedMedia).toEqual(mockMedia);
      expect(mediaRemovedEvent).toEqual(MediaRemovedEvent.new(mockMedia.getId(), mockMedia.getOwnerId(), mockMedia.getType()));
      
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
