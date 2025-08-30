import { Interface } from '@core/common/interface/Interface';
import { GetPostListDto } from '@core/domain/post/port/dto/GetPostListDto';
import { PostInterfaceDto } from '@core/domain/post/port/dto/PostInterfaceDto';

export interface GetPostListInterface extends Interface<GetPostListDto, PostInterfaceDto[]> {}
