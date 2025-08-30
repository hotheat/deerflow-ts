import { ValidatorAdapter } from '@core/common/adapter/validator/ValidatorAdapter';
import { PostStatus } from '@core/common/enums/PostEnums';
import { GetPostListDto } from '@core/domain/post/port/dto/GetPostListDto';
import { Exclude, Expose, plainToClass } from 'class-transformer';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';

@Exclude()
export class GetPostListValidator extends ValidatorAdapter implements GetPostListDto {
  
  @Expose()
  @IsUUID()
  public executorId: string;
  
  @Expose()
  @IsOptional()
  @IsUUID()
  public ownerId?: string;
  
  @Expose()
  @IsOptional()
  @IsEnum(PostStatus)
  public status?: PostStatus;
  
  public static async new(payload: GetPostListDto): Promise<GetPostListValidator> {
    const validator: GetPostListValidator = plainToClass(GetPostListValidator, payload);
    await validator.validate();
    
    return validator;
  }
  
}
