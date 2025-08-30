import { ApiProperty } from '@nestjs/swagger';
import { PrimitiveValue } from '@core/common/type/CommonTypes';

export class HttpRestApiResponse<TData = Record<string, PrimitiveValue> | Record<string, PrimitiveValue>[] | object> {
  
  @ApiProperty({type: 'number'})
  public code: number;
  
  @ApiProperty({ type: 'string' })
  public message: string;
  
  @ApiProperty({ description: 'timestamp in ms', type: 'number' })
  public timestamp: number;
  
  @ApiProperty({ type: 'object' })
  public data: TData | null;

}
