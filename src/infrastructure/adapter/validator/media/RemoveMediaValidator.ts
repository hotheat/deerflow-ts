import { ValidatorAdapter } from '@core/common/adapter/validator/ValidatorAdapter';
import { RemoveMediaDto } from '@core/domain/media/port/dto/RemoveMediaDto';
import { Exclude, Expose, plainToClass } from 'class-transformer';
import { IsUUID } from 'class-validator';

@Exclude()
export class RemoveMediaValidator extends ValidatorAdapter implements RemoveMediaDto {
  
  @Expose()
  @IsUUID()
  public executorId: string;
  
  @Expose()
  @IsUUID()
  public mediaId: string;
  
  public static async new(payload: RemoveMediaDto): Promise<RemoveMediaValidator> {
    const validator: RemoveMediaValidator = plainToClass(RemoveMediaValidator, payload);
    await validator.validate();
    
    return validator;
  }
  
}
