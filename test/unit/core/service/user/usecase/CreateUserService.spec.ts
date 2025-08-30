import { Code } from '@core/common/code/Code';
import { UserRole } from '@core/common/enums/UserEnums';
import { Exception } from '@core/common/exception/Exception';
import { ClassValidationDetails } from '@core/common/util/class-validator/ClassValidator';
import { UserDITokens } from '@core/domain/user/di/UserDITokens';
import { User } from '@core/domain/user/entity/User';
import { UserRepositoryPort } from '@core/domain/user/port/persistence/UserRepositoryPort';
import { CreateUserDto } from '@core/domain/user/port/dto/CreateUserDto';
import { CreateUserInterface } from '@core/domain/user/interface/CreateUserInterface';
import { UserInterfaceDto } from '@core/domain/user/port/dto/UserInterfaceDto';
import { CreateUserService } from '@core/service/user/service/CreateUserService';
import { Test, TestingModule } from '@nestjs/testing';
import { v4 } from 'uuid';

describe('CreateUserService', () => {
  let createUserService: CreateUserInterface;
  let userRepository: UserRepositoryPort;
  
  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: UserDITokens.CreateUserInterface,
          useFactory: (userRepository) => new CreateUserService(userRepository),
          inject: [UserDITokens.UserRepository]
        },
        {
          provide: UserDITokens.UserRepository,
          useValue: {
            countUsers: jest.fn(),
            addUser: jest.fn()
          }
        },
      ]
    }).compile();
  
    createUserService = module.get<CreateUserInterface>(UserDITokens.CreateUserInterface);
    userRepository    = module.get<UserRepositoryPort>(UserDITokens.UserRepository);
  });
  
  describe('execute', () => {
  
    test('Expect it creates user', async () => {
      const mockUserId: string = v4();
    
      jest.spyOn(userRepository, 'countUsers').mockImplementation(async () => 0);
      jest.spyOn(userRepository, 'addUser').mockImplementation(async () => {
        return {id: mockUserId};
      });
    
      jest.spyOn(userRepository, 'addUser').mockClear();
  
      const createUserDto: CreateUserDto = createDto();
    
      const expectedUser: User = await User.new({
        id       : mockUserId,
        firstName: createUserDto.firstName,
        lastName : createUserDto.lastName,
        email    : createUserDto.email,
        role     : createUserDto.role,
        password : createUserDto.password,
      });
    
      const expectedUserInterfaceDto: UserInterfaceDto = UserInterfaceDto.newFromUser(expectedUser);
    
      const resultUserInterfaceDto: UserInterfaceDto = await createUserService.execute(createUserDto);
      Reflect.set(resultUserInterfaceDto, 'id', expectedUserInterfaceDto.id);
      Reflect.set(resultUserInterfaceDto, 'createdAt', expectedUserInterfaceDto.createdAt);
    
      const resultAddedUser: User = jest.spyOn(userRepository, 'addUser').mock.calls[0][0];
      Reflect.set(resultAddedUser, 'id', expectedUser.getId());
      Reflect.set(resultAddedUser, 'createdAt', expectedUser.getCreatedAt());
      Reflect.set(resultAddedUser, 'password', expectedUser.getPassword());
    
      expect(resultUserInterfaceDto).toEqual(expectedUserInterfaceDto);
      expect(resultAddedUser).toEqual(expectedUser);
    });
  
    test('When user already exists, expect it throws Exception', async () => {
      jest.spyOn(userRepository, 'countUsers').mockImplementation(async () => 1);
  
      expect.hasAssertions();
      
      try {
        const createUserDto: CreateUserDto = createDto();
        await createUserService.execute(createUserDto);
      
      } catch (e) {
      
        const exception: Exception<ClassValidationDetails> = e as Exception<ClassValidationDetails>;
      
        expect(exception).toBeInstanceOf(Exception);
        expect(exception.code).toBe(Code.ENTITY_ALREADY_EXISTS_ERROR.code);
      }
    });
  
  });
  
});

function createDto(): CreateUserDto {
  return {
    firstName: v4(),
    lastName : v4(),
    email    : 'author@email.com',
    role     : UserRole.AUTHOR,
    password : v4(),
  };
}
