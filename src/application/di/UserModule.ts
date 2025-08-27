import { UserController } from '@application/api/http-rest/controller/UserController';
import { PersistenceModule } from '@application/di/PersistenceModule';
import { UserDITokens } from '@core/domain/user/di/UserDITokens';
import { CreateUserService } from '@core/service/user/usecase/CreateUserService';
import { GetUserService } from '@core/service/user/usecase/GetUserService';
import { Module, Provider } from '@nestjs/common';


const useCaseProviders: Provider[] = [
  {
    provide   : UserDITokens.CreateUserUseCase,
    useFactory: (userRepository) => new CreateUserService(userRepository),
    inject    : [UserDITokens.UserRepository]
  },
  {
    provide   : UserDITokens.GetUserUseCase,
    useFactory: (userRepository) => new GetUserService(userRepository),
    inject    : [UserDITokens.UserRepository]
  },
];


@Module({
  imports: [
    PersistenceModule
  ],
  controllers: [
    UserController
  ],
  providers: [
    ...useCaseProviders,
  ],
  exports: []
})
export class UserModule {}
