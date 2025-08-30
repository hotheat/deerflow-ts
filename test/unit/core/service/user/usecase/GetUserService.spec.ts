import { Code } from '@core/common/code/Code';
import { UserRole } from '@core/common/enums/UserEnums';
import { Exception } from '@core/common/exception/Exception';
import { ClassValidationDetails } from '@core/common/util/class-validator/ClassValidator';
import { UserDITokens } from '@core/domain/user/di/UserDITokens';
import { User } from '@core/domain/user/entity/User';
import { UserRepositoryPort } from '@core/domain/user/port/persistence/UserRepositoryPort';
import { GetUserDto } from '@core/domain/user/port/dto/GetUserDto';
import { UserInterfaceDto } from '@core/domain/user/port/dto/UserInterfaceDto';
import { GetUserInterface } from '@core/domain/user/interface/GetUserInterface';
import { GetUserService } from '@core/service/user/service/GetUserService';
import { Test, TestingModule } from '@nestjs/testing';
import { v4 } from 'uuid';

describe('GetUserService', () => {
  let getUserService: GetUserInterface;
  let userRepository: UserRepositoryPort;
  
  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: UserDITokens.GetUserInterface,
          useFactory: (userRepository) => new GetUserService(userRepository),
          inject: [UserDITokens.UserRepository]
        },
        {
          provide: UserDITokens.UserRepository,
          useValue: {
            findUser: jest.fn()
          }
        },
      ]
    }).compile();
  
    getUserService = module.get<GetUserInterface>(UserDITokens.GetUserInterface);
    userRepository = module.get<UserRepositoryPort>(UserDITokens.UserRepository);
  });
  
  describe('execute', () => {
  
    test('Expect it returns user', async () => {
      const mockUser: User = await createUser();
    
      jest.spyOn(userRepository, 'findUser').mockImplementation(async () => mockUser);
  
      const expectedUserInterfaceDto: UserInterfaceDto = UserInterfaceDto.newFromUser(mockUser);
  
      const getUserDto: GetUserDto = {userId: mockUser.getId()};
      const resultUserInterfaceDto: UserInterfaceDto = await getUserService.execute(getUserDto);
  
      expect(resultUserInterfaceDto).toEqual(expectedUserInterfaceDto);
    });
  
    test('When user not found, expect it throws Exception', async () => {
      jest.spyOn(userRepository, 'findUser').mockImplementation(async () => undefined);
    
      expect.hasAssertions();
    
      try {
        const getUserDto: GetUserDto = {userId: v4()};
        await getUserService.execute(getUserDto);
      
      } catch (e) {
      
        const exception: Exception<ClassValidationDetails> = e as Exception<ClassValidationDetails>;
      
        expect(exception).toBeInstanceOf(Exception);
        expect(exception.code).toBe(Code.ENTITY_NOT_FOUND_ERROR.code);
      }
    });
  
  });
  
});

async function createUser(): Promise<User> {
  return User.new({
    firstName: v4(),
    lastName : v4(),
    email    : 'author@email.com',
    role     : UserRole.AUTHOR,
    password : v4(),
  });
}
