import { UseCase } from '@core/common/interface/Interface';
import { StreamChatDto, StreamChatResponseDto } from '../port/dto/StreamChatDto';

/**
 * Use case interface for streaming chat functionality.
 * Defines the contract for chat streaming operations.
 */
export interface StreamChatInterface extends UseCase<StreamChatDto, AsyncIterableIterator<StreamChatResponseDto>> {
  execute(port: StreamChatDto): Promise<AsyncIterableIterator<StreamChatResponseDto>>;
}