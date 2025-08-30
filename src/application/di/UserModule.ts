import { UserController } from '@application/api/http-rest/controller/UserController';
import { PersistenceModule } from '@application/di/PersistenceModule';
import { UserDITokens } from '@core/domain/user/di/UserDITokens';
import { CreateUserService } from '@core/service/user/service/CreateUserService';
import { GetUserService } from '@core/service/user/service/GetUserService';
import { Module, Provider } from '@nestjs/common';


const useCaseProviders: Provider[] = [
  {
    provide   : UserDITokens.CreateUserInterface,
    useFactory: (userRepository) => new CreateUserService(userRepository),
    inject    : [UserDITokens.UserRepository]
  },
  {
    provide   : UserDITokens.GetUserInterface,
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
