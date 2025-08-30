import { PostStatus } from '@core/common/enums/PostEnums';

export interface GetPostListDto {
  executorId: string;
  ownerId?: string;
  status?: PostStatus;
}
