import { ValidatorAdapter } from '@core/common/adapter/validator/ValidatorAdapter';
import { UserRole } from '@core/common/enums/UserEnums';
import { CreateUserDto } from '@core/domain/user/port/dto/CreateUserDto';
import { Exclude, Expose, plainToClass } from 'class-transformer';
import { IsEmail, IsIn, IsString } from 'class-validator';

@Exclude()
export class CreateUserValidator extends ValidatorAdapter implements CreateUserDto {
  
  @Expose()
  @IsString()
  public firstName: string;
  
  @Expose()
  @IsString()
  public lastName: string;
  
  @Expose()
  @IsEmail()
  public email: string;
  
  @Expose()
  @IsIn([UserRole.AUTHOR, UserRole.GUEST])
  public role: UserRole;
  
  @Expose()
  @IsString()
  public password: string;
  
  public static async new(payload: CreateUserDto): Promise<CreateUserValidator> {
    const validator: CreateUserValidator = plainToClass(CreateUserValidator, payload);
    await validator.validate();
    
    return validator;
  }
  
}
