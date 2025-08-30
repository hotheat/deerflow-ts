import { HttpAuth } from '@application/api/http-rest/auth/decorator/HttpAuth';
import { HttpUser } from '@application/api/http-rest/auth/decorator/HttpUser';
import { HttpUserPayload } from '@application/api/http-rest/auth/type/HttpAuthTypes';
import { HttpRestApiModelCreateUserBody } from '@application/api/http-rest/controller/documentation/user/HttpRestApiModelCreateUserBody';
import { HttpRestApiResponseUser } from '@application/api/http-rest/controller/documentation/user/HttpRestApiResponseUser';
import { CoreApiResponse } from '@core/common/api/CoreApiResponse';
import { UserRole } from '@core/common/enums/UserEnums';
import { UserDITokens } from '@core/domain/user/di/UserDITokens';
import { CreateUserInterface } from '@core/domain/user/interface/CreateUserInterface';
import { UserInterfaceDto } from '@core/domain/user/port/dto/UserInterfaceDto';
import { GetUserInterface } from '@core/domain/user/interface/GetUserInterface';
import { CreateUserValidator } from '@infrastructure/adapter/validator/user/CreateUserValidator';
import { GetUserValidator } from '@infrastructure/adapter/validator/user/GetUserValidator';
import { Body, Controller, Get, HttpCode, HttpStatus, Inject, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiResponse, ApiTags } from '@nestjs/swagger';

@Controller('users')
@ApiTags('users')
export class UserController {
  
  constructor(
    @Inject(UserDITokens.CreateUserInterface)
    private readonly createUserInterface: CreateUserInterface,
    
    @Inject(UserDITokens.GetUserInterface)
    private readonly getUserInterface: GetUserInterface,
  ) {}
  
  @Post('account')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiBody({type: HttpRestApiModelCreateUserBody})
  @ApiResponse({status: HttpStatus.OK, type: HttpRestApiResponseUser})
  public async createAccount(@Body() body: HttpRestApiModelCreateUserBody): Promise<CoreApiResponse<UserInterfaceDto>> {
    const adapter: CreateUserValidator = await CreateUserValidator.new({
      firstName  : body.firstName,
      lastName   : body.lastName,
      email      : body.email,
      role       : body.role,
      password   : body.password
    });
    
    const createdUser: UserInterfaceDto = await this.createUserInterface.execute(adapter);
    
    return CoreApiResponse.success(createdUser);
  }
  
  @Get('me')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @HttpAuth(UserRole.AUTHOR, UserRole.ADMIN, UserRole.GUEST)
  @ApiResponse({status: HttpStatus.OK, type: HttpRestApiResponseUser})
  public async getMe(@HttpUser() httpUser: HttpUserPayload): Promise<CoreApiResponse<UserInterfaceDto>> {
    const adapter: GetUserValidator = await GetUserValidator.new({userId: httpUser.id});
    const user: UserInterfaceDto = await this.getUserInterface.execute(adapter);
    
    return CoreApiResponse.success(user);
  }
  
}
