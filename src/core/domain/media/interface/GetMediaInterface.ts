import { Interface } from '@core/common/interface/Interface';
import { GetMediaDto } from '@core/domain/media/port/dto/GetMediaDto';
import { MediaInterfaceDto } from '@core/domain/media/port/dto/MediaInterfaceDto';

export interface GetMediaInterface extends Interface<GetMediaDto, MediaInterfaceDto> {}