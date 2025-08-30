import { Code } from '@core/common/code/Code';
import { Exception } from '@core/common/exception/Exception';
import { CoreAssert } from '@core/common/util/assert/CoreAssert';
import { User } from '@core/domain/user/entity/User';
import { UserRepositoryPort } from '@core/domain/user/port/persistence/UserRepositoryPort';
import { CreateUserDto } from '@core/domain/user/port/dto/CreateUserDto';
import { CreateUserInterface } from '@core/domain/user/interface/CreateUserInterface';
import { UserInterfaceDto } from '@core/domain/user/port/dto/UserInterfaceDto';

export class CreateUserService implements CreateUserInterface {
  
  constructor(
    private readonly userRepository: UserRepositoryPort,
  ) {}
  
  public async execute(payload: CreateUserDto): Promise<UserInterfaceDto> {
    const doesUserExist: boolean = !! await this.userRepository.countUsers({email: payload.email});
    CoreAssert.isFalse(doesUserExist, Exception.new({code: Code.ENTITY_ALREADY_EXISTS_ERROR, overrideMessage: 'User already exists.'}));

    const user: User = await User.new({
      firstName: payload.firstName,
      lastName: payload.lastName,
      email: payload.email,
      role: payload.role,
      password: payload.password,
    });
    
    await this.userRepository.addUser(user);
    
    return UserInterfaceDto.newFromUser(user);
  }
  
}
