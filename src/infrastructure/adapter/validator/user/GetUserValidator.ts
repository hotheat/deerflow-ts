import { ValidatorAdapter } from '@core/common/adapter/validator/ValidatorAdapter';
import { GetUserDto } from '@core/domain/user/port/dto/GetUserDto';
import { Exclude, Expose, plainToClass } from 'class-transformer';
import { IsUUID } from 'class-validator';

@Exclude()
export class GetUserValidator extends ValidatorAdapter implements GetUserDto {
  
  @Expose()
  @IsUUID()
  public userId: string;
  
  public static async new(payload: GetUserDto): Promise<GetUserValidator> {
    const validator: GetUserValidator = plainToClass(GetUserValidator, payload);
    await validator.validate();
    
    return validator;
  }
  
}
