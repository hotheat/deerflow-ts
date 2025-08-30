import { ValidatorAdapter } from '@core/common/adapter/validator/ValidatorAdapter';
import { EditPostDto } from '@core/domain/post/port/dto/EditPostDto';
import { Exclude, Expose, plainToClass } from 'class-transformer';
import { IsOptional, IsString, IsUUID } from 'class-validator';

@Exclude()
export class EditPostValidator extends ValidatorAdapter implements EditPostDto {
  
  @Expose()
  @IsUUID()
  public executorId: string;
  
  @Expose()
  @IsUUID()
  public postId: string;
  
  @Expose()
  @IsOptional()
  @IsString()
  public title?: string;
  
  @Expose()
  @IsOptional()
  @IsUUID()
  public imageId?: string;
  
  @Expose()
  @IsOptional()
  @IsString()
  public content?: string;
  
  public static async new(payload: EditPostDto): Promise<EditPostValidator> {
    const validator: EditPostValidator = plainToClass(EditPostValidator, payload);
    await validator.validate();
    
    return validator;
  }
  
}
