import { ValidatorAdapter } from '@core/common/adapter/validator/ValidatorAdapter';
import { MediaType } from '@core/common/enums/MediaEnums';
import { CreateMediaDto } from '@core/domain/media/port/dto/CreateMediaDto';
import { Exclude, Expose, plainToClass } from 'class-transformer';
import { IsDefined, IsEnum, IsString, IsUUID } from 'class-validator';

@Exclude()
export class CreateMediaValidator extends ValidatorAdapter implements CreateMediaDto {
  
  @Expose()
  @IsUUID()
  public executorId: string;
  
  @Expose()
  @IsString()
  public name: string;
  
  @Expose()
  @IsEnum(MediaType)
  public type: MediaType;
  
  @Expose()
  @IsDefined()
  public file: Buffer|NodeJS.ReadableStream;
  
  public static async new(payload: CreateMediaDto): Promise<CreateMediaValidator> {
    const validator: CreateMediaValidator = plainToClass(CreateMediaValidator, payload);
    await validator.validate();
    
    return validator;
  }
  
}
