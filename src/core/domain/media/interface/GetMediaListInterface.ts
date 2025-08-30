import { Interface } from '@core/common/interface/Interface';
import { GetMediaListDto } from '@core/domain/media/port/dto/GetMediaListDto';
import { MediaInterfaceDto } from '@core/domain/media/port/dto/MediaInterfaceDto';

export interface GetMediaListInterface extends Interface<GetMediaListDto, MediaInterfaceDto[]> {}