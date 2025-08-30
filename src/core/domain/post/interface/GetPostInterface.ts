import { Interface } from '@core/common/interface/Interface';
import { GetPostDto } from '@core/domain/post/port/dto/GetPostDto';
import { PostInterfaceDto } from '@core/domain/post/port/dto/PostInterfaceDto';

export interface GetPostInterface extends Interface<GetPostDto, PostInterfaceDto> {}
