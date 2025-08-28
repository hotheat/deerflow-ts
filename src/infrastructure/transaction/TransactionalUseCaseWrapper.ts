import { TransactionalUseCase } from '@core/common/usecase/TransactionalUseCase';
import { UseCase } from '@core/common/usecase/UseCase';
import { PrismaService } from '@infrastructure/adapter/persistence/PrismaService';

export class TransactionalUseCaseWrapper<TUseCasePort, TUseCaseResult> implements UseCase<TUseCasePort, TUseCaseResult> {
  
  constructor(
    private readonly useCase: TransactionalUseCase<TUseCasePort, TUseCaseResult>,
    private readonly prismaService: PrismaService,
  ) {}
  
  public async execute(port: TUseCasePort): Promise<TUseCaseResult> {
    return this.prismaService.runInTransaction(async () => {
      try {
        const result: TUseCaseResult = await this.useCase.execute(port);
        
        // Execute commit callback if defined
        await this.useCase.onCommit?.(result, port);
        
        return result;
      } catch (error) {
        // Execute rollback callback if defined
        await this.useCase.onRollback?.(error as Error, port);
        throw error;
      }
    });
  }
  
}