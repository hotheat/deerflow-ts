import { TransactionalInterface } from '@core/common/interface/TransactionalInterface';
import { RemovePostDto } from '@core/domain/post/port/dto/RemovePostDto';

export interface RemovePostInterface extends TransactionalInterface<RemovePostDto, void> {}
