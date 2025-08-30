import { TransactionalInterface } from '@core/common/interface/TransactionalInterface';
import { CreateMediaDto } from '@core/domain/media/port/dto/CreateMediaDto';
import { MediaInterfaceDto } from '@core/domain/media/port/dto/MediaInterfaceDto';

export interface CreateMediaInterface extends TransactionalInterface<CreateMediaDto, MediaInterfaceDto> {}