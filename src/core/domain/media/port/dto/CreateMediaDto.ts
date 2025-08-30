import { MediaType } from '@core/common/enums/MediaEnums';

export interface CreateMediaDto {
  executorId: string;
  name: string;
  type: MediaType;
  file: Buffer|NodeJS.ReadableStream;
}
