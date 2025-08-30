import { ValidatorAdapter } from '@core/common/adapter/validator/ValidatorAdapter';
import { GetMediaListDto } from '@core/domain/media/port/dto/GetMediaListDto';
import { Exclude, Expose, plainToClass } from 'class-transformer';
import { IsUUID } from 'class-validator';

@Exclude()
export class GetMediaListValidator extends ValidatorAdapter implements GetMediaListDto {
  
  @Expose()
  @IsUUID()
  public executorId: string;
  
  public static async new(payload: GetMediaListDto): Promise<GetMediaListValidator> {
    const validator: GetMediaListValidator = plainToClass(GetMediaListValidator, payload);
    await validator.validate();
    
    return validator;
  }
  
}
