import { Interface } from '@core/common/interface/Interface';
import { CreateUserDto } from '@core/domain/user/port/dto/CreateUserDto';
import { UserInterfaceDto } from '@core/domain/user/port/dto/UserInterfaceDto';

export interface CreateUserInterface extends Interface<CreateUserDto, UserInterfaceDto> {}
