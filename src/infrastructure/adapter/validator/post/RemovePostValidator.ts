import { ValidatorAdapter } from '@core/common/adapter/validator/ValidatorAdapter';
import { RemovePostDto } from '@core/domain/post/port/dto/RemovePostDto';
import { Exclude, Expose, plainToClass } from 'class-transformer';
import { IsUUID } from 'class-validator';

@Exclude()
export class RemovePostValidator extends ValidatorAdapter implements RemovePostDto {
  
  @Expose()
  @IsUUID()
  public executorId: string;
  
  @Expose()
  @IsUUID()
  public postId: string;
  
  public static async new(payload: RemovePostDto): Promise<RemovePostValidator> {
    const validator: RemovePostValidator = plainToClass(RemovePostValidator, payload);
    await validator.validate();
    
    return validator;
  }
  
}
