import { TransactionalInterface } from '@core/common/interface/TransactionalInterface';
import { RemoveMediaDto } from '@core/domain/media/port/dto/RemoveMediaDto';

export interface RemoveMediaInterface extends TransactionalInterface<RemoveMediaDto, void> {}