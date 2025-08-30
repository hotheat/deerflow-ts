import { ValidatorAdapter } from '@core/common/adapter/validator/ValidatorAdapter';
import { GetMediaDto } from '@core/domain/media/port/dto/GetMediaDto';
import { Exclude, Expose, plainToClass } from 'class-transformer';
import { IsUUID } from 'class-validator';

@Exclude()
export class GetMediaValidator extends ValidatorAdapter implements GetMediaDto {
  
  @Expose()
  @IsUUID()
  public executorId: string;
  
  @Expose()
  @IsUUID()
  public mediaId: string;
  
  public static async new(payload: GetMediaDto): Promise<GetMediaValidator> {
    const validator: GetMediaValidator = plainToClass(GetMediaValidator, payload);
    await validator.validate();
    
    return validator;
  }
  
}
