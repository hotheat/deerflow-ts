import { Code } from '@core/common/code/Code';
import { Exception } from '@core/common/exception/Exception';
import { Optional } from '@core/common/type/CommonTypes';
import { User } from '@core/domain/user/entity/User';
import { UserRepositoryPort } from '@core/domain/user/port/persistence/UserRepositoryPort';
import { GetUserDto } from '@core/domain/user/port/dto/GetUserDto';
import { UserInterfaceDto } from '@core/domain/user/port/dto/UserInterfaceDto';
import { GetUserInterface } from '@core/domain/user/interface/GetUserInterface';

export class GetUserService implements GetUserInterface {
  
  constructor(
    private readonly userRepository: UserRepositoryPort,
  ) {}
  
  public async execute(payload: GetUserDto): Promise<UserInterfaceDto> {
    const user: Optional<User> = await this.userRepository.findUser({id: payload.userId});
    if (!user) {
      throw Exception.new({code: Code.ENTITY_NOT_FOUND_ERROR, overrideMessage: 'User not found.'});
    }
    
    return UserInterfaceDto.newFromUser(user);
  }
  
}
