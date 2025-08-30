import { MediaType } from '@core/common/enums/MediaEnums';
import { MediaDITokens } from '@core/domain/media/di/MediaDITokens';
import { Media } from '@core/domain/media/entity/Media';
import { MediaFileStoragePort } from '@core/domain/media/port/persistence/MediaFileStoragePort';
import { MediaRepositoryPort } from '@core/domain/media/port/persistence/MediaRepositoryPort';
import { CreateMediaDto } from '@core/domain/media/port/dto/CreateMediaDto';
import { CreateMediaInterface } from '@core/domain/media/interface/CreateMediaInterface';
import { MediaInterfaceDto } from '@core/domain/media/port/dto/MediaInterfaceDto';
import { FileMetadata } from '@core/domain/media/value-object/FileMetadata';
import { CreateFileMetadataValueObjectPayload } from '@core/domain/media/value-object/type/CreateFileMetadataValueObjectPayload';
import { CreateMediaService } from '@core/service/media/service/CreateMediaService';
import { MinioMediaFileStorageAdapter } from '@infrastructure/adapter/persistence/media-file/MinioMediaFileStorageAdapter';
import { Test, TestingModule } from '@nestjs/testing';
import { v4 } from 'uuid';

describe('CreateMediaService', () => {
  let createMediaService: CreateMediaInterface;
  let mediaRepository: MediaRepositoryPort;
  let mediaFileStorage: MediaFileStoragePort;
  
  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: MediaDITokens.CreateMediaInterface,
          useFactory: (mediaRepository, mediaFileStorage) => new CreateMediaService(mediaRepository, mediaFileStorage),
          inject: [MediaDITokens.MediaRepository, MediaDITokens.MediaFileStorage]
        },
        {
          provide: MediaDITokens.MediaRepository,
          useValue: {
            addMedia: jest.fn()
          }
        },
        {
          provide: MediaDITokens.MediaFileStorage,
          useClass: MinioMediaFileStorageAdapter
        }
      ]
    }).compile();
  
    createMediaService = module.get<CreateMediaInterface>(MediaDITokens.CreateMediaInterface);
    mediaRepository    = module.get<MediaRepositoryPort>(MediaDITokens.MediaRepository);
    mediaFileStorage   = module.get<MediaFileStoragePort>(MediaDITokens.MediaFileStorage);
  });
  
  describe('execute', () => {
  
    test('Expect it uploads media file and adds media record to repository', async () => {
      const mockFileMetadata: FileMetadata = await createFileMetadata();
      const mockMediaId: string = v4();
      
      jest.spyOn(mediaFileStorage, 'upload').mockImplementation(async () => mockFileMetadata);
      jest.spyOn(mediaRepository, 'addMedia').mockImplementation(async () => {
        return {id: mockMediaId};
      });
  
      jest.spyOn(mediaRepository, 'addMedia').mockClear();
  
      const createMediaPort: CreateMediaDto = {
        executorId: v4(),
        name      : v4(),
        type      : MediaType.IMAGE,
        file      : Buffer.from(''),
      };
      
      const expectedMedia: Media = await Media.new({
        id      : mockMediaId,
        ownerId : createMediaPort.executorId,
        name    : createMediaPort.name,
        type    : createMediaPort.type,
        metadata: mockFileMetadata,
      });
  
      const expectedMediaInterfaceDto: MediaInterfaceDto = await MediaInterfaceDto.newFromMedia(expectedMedia);
      
      const resultMediaInterfaceDto: MediaInterfaceDto = await createMediaService.execute(createMediaPort);
      Reflect.set(resultMediaInterfaceDto, 'id', expectedMediaInterfaceDto.id);
      Reflect.set(resultMediaInterfaceDto, 'createdAt', expectedMediaInterfaceDto.createdAt);
      
      const resultAddedMedia: Media = jest.spyOn(mediaRepository, 'addMedia').mock.calls[0][0];
      Reflect.set(resultAddedMedia, 'id', expectedMedia.getId());
      Reflect.set(resultAddedMedia, 'createdAt', expectedMedia.getCreatedAt());
      
      expect(resultMediaInterfaceDto).toEqual(expectedMediaInterfaceDto);
      expect(resultAddedMedia).toEqual(expectedMedia);
    });
    
  });
  
});

async function createFileMetadata(): Promise<FileMetadata> {
  const createFileMetadataValueObjectPayload: CreateFileMetadataValueObjectPayload = {
    relativePath: '/relative/path',
    size        : 10_000_000,
    ext         : 'png',
    mimetype    : 'image/png'
  };
  
  return FileMetadata.new(createFileMetadataValueObjectPayload);
}
