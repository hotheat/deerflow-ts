import { ValidatorAdapter } from '@core/common/adapter/validator/ValidatorAdapter';
import { GetPostDto } from '@core/domain/post/port/dto/GetPostDto';
import { Exclude, Expose, plainToClass } from 'class-transformer';
import { IsUUID } from 'class-validator';

@Exclude()
export class GetPostValidator extends ValidatorAdapter implements GetPostDto {
  
  @Expose()
  @IsUUID()
  public executorId: string;
  
  @Expose()
  @IsUUID()
  public postId: string;
  
  public static async new(payload: GetPostDto): Promise<GetPostValidator> {
    const validator: GetPostValidator = plainToClass(GetPostValidator, payload);
    await validator.validate();
    
    return validator;
  }
  
}
