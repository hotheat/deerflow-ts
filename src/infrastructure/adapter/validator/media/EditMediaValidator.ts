import { ValidatorAdapter } from '@core/common/adapter/validator/ValidatorAdapter';
import { EditMediaDto } from '@core/domain/media/port/dto/EditMediaDto';
import { Exclude, Expose, plainToClass } from 'class-transformer';
import { IsOptional, IsString, IsUUID } from 'class-validator';

@Exclude()
export class EditMediaValidator extends ValidatorAdapter implements EditMediaDto {
  
  @Expose()
  @IsUUID()
  public executorId: string;
  
  @Expose()
  @IsUUID()
  public mediaId: string;
  
  @Expose()
  @IsOptional()
  @IsString()
  public name?: string;
  
  public static async new(payload: EditMediaDto): Promise<EditMediaValidator> {
    const validator: EditMediaValidator = plainToClass(EditMediaValidator, payload);
    await validator.validate();
    
    return validator;
  }
  
}
