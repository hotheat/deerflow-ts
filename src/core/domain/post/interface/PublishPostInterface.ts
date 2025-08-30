import { TransactionalInterface } from '@core/common/interface/TransactionalInterface';
import { PublishPostDto } from '@core/domain/post/port/dto/PublishPostDto';
import { PostInterfaceDto } from '@core/domain/post/port/dto/PostInterfaceDto';

export interface PublishPostInterface extends TransactionalInterface<PublishPostDto, PostInterfaceDto> {}
