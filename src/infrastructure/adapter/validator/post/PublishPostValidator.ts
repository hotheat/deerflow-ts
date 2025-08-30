import { ValidatorAdapter } from '@core/common/adapter/validator/ValidatorAdapter';
import { PublishPostDto } from '@core/domain/post/port/dto/PublishPostDto';
import { Exclude, Expose, plainToClass } from 'class-transformer';
import { IsUUID } from 'class-validator';

@Exclude()
export class PublishPostValidator extends ValidatorAdapter implements PublishPostDto {
  
  @Expose()
  @IsUUID()
  public executorId: string;
  
  @Expose()
  @IsUUID()
  public postId: string;
  
  public static async new(payload: PublishPostDto): Promise<PublishPostValidator> {
    const validator: PublishPostValidator = plainToClass(PublishPostValidator, payload);
    await validator.validate();
    
    return validator;
  }
  
}
