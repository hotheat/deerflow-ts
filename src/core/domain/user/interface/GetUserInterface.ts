import { Interface } from '@core/common/interface/Interface';
import { GetUserDto } from '@core/domain/user/port/dto/GetUserDto';
import { UserInterfaceDto } from '@core/domain/user/port/dto/UserInterfaceDto';

export interface GetUserInterface extends Interface<GetUserDto, UserInterfaceDto> {}
