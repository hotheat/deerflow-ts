import { ValidatorAdapter } from '@core/common/adapter/validator/ValidatorAdapter';
import { CreatePostDto } from '@core/domain/post/port/dto/CreatePostDto';
import { Exclude, Expose, plainToClass } from 'class-transformer';
import { IsOptional, IsString, IsUUID } from 'class-validator';

@Exclude()
export class CreatePostValidator extends ValidatorAdapter implements CreatePostDto {
  
  @Expose()
  @IsUUID()
  public executorId: string;
  
  @Expose()
  @IsString()
  public title: string;
  
  @Expose()
  @IsOptional()
  @IsUUID()
  public imageId?: string;
  
  @Expose()
  @IsOptional()
  @IsString()
  public content?: string;
  
  public static async new(payload: CreatePostDto): Promise<CreatePostValidator> {
    const validator: CreatePostValidator = plainToClass(CreatePostValidator, payload);
    await validator.validate();
    
    return validator;
  }
  
}
