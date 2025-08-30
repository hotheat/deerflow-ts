import { TransactionalInterface } from '@core/common/interface/TransactionalInterface';
import { EditMediaDto } from '@core/domain/media/port/dto/EditMediaDto';
import { MediaInterfaceDto } from '@core/domain/media/port/dto/MediaInterfaceDto';

export interface EditMediaInterface extends TransactionalInterface<EditMediaDto, MediaInterfaceDto> {}