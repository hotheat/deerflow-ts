import { TransactionalInterface } from '@core/common/interface/TransactionalInterface';
import { EditPostDto } from '@core/domain/post/port/dto/EditPostDto';
import { PostInterfaceDto } from '@core/domain/post/port/dto/PostInterfaceDto';

export interface EditPostInterface extends TransactionalInterface<EditPostDto, PostInterfaceDto> {}
