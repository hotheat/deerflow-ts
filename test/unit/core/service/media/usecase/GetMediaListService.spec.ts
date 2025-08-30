import { MediaType } from '@core/common/enums/MediaEnums';
import { MediaDITokens } from '@core/domain/media/di/MediaDITokens';
import { Media } from '@core/domain/media/entity/Media';
import { MediaRepositoryPort } from '@core/domain/media/port/persistence/MediaRepositoryPort';
import { GetMediaListDto } from '@core/domain/media/port/dto/GetMediaListDto';
import { MediaInterfaceDto } from '@core/domain/media/port/dto/MediaInterfaceDto';
import { GetMediaListInterface } from '@core/domain/media/interface/GetMediaListInterface';
import { FileMetadata } from '@core/domain/media/value-object/FileMetadata';
import { GetMediaListService } from '@core/service/media/service/GetMediaListService';
import { Test, TestingModule } from '@nestjs/testing';
import { v4 } from 'uuid';

describe('GetMediaListService', () => {
  let getMediaListService: GetMediaListInterface;
  let mediaRepository: MediaRepositoryPort;
  
  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: MediaDITokens.GetMediaListInterface,
          useFactory: (mediaRepository) => new GetMediaListService(mediaRepository),
          inject: [MediaDITokens.MediaRepository]
        },
        {
          provide: MediaDITokens.MediaRepository,
          useValue: {
            findMedias: jest.fn()
          }
        }
      ]
    }).compile();
  
    getMediaListService = module.get<GetMediaListInterface>(MediaDITokens.GetMediaListInterface);
    mediaRepository = module.get<MediaRepositoryPort>(MediaDITokens.MediaRepository);
  });
  
  describe('execute', () => {
  
    test('Expect it returns media list', async () => {
      const mockMedia: Media = await createMedia();
      
      jest.spyOn(mediaRepository, 'findMedias').mockImplementation(async () => [mockMedia]);
      
      const expectedMediaInterfaceDto: MediaInterfaceDto = MediaInterfaceDto.newFromMedia(mockMedia);
  
      const getMediaListDto: GetMediaListDto = {executorId: mockMedia.getOwnerId()};
      const resultMediaInterfaceDtos: MediaInterfaceDto[] = await getMediaListService.execute(getMediaListDto);
  
      expect(resultMediaInterfaceDtos.length).toBe(1);
      expect(resultMediaInterfaceDtos[0]).toEqual(expectedMediaInterfaceDto);
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
  });
}
