import { TransactionalInterface } from '@core/common/interface/TransactionalInterface';
import { CreatePostDto } from '@core/domain/post/port/dto/CreatePostDto';
import { PostInterfaceDto } from '@core/domain/post/port/dto/PostInterfaceDto';

export interface CreatePostInterface extends TransactionalInterface<CreatePostDto, PostInterfaceDto> {}
