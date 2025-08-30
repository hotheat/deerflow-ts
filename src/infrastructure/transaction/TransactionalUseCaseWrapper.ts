import { TransactionalInterface } from '@core/common/interface/TransactionalInterface';
import { Interface } from '@core/common/interface/Interface';
import { PrismaService } from '@infrastructure/adapter/persistence/PrismaService';

export class TransactionalUseCaseWrapper<TInterfaceDto, TInterfaceResult> implements Interface<TInterfaceDto, TInterfaceResult> {
  
  constructor(
    private readonly useCase: TransactionalInterface<TInterfaceDto, TInterfaceResult>,
    private readonly prismaService: PrismaService,
  ) {}
  
  public async execute(port: TInterfaceDto): Promise<TInterfaceResult> {
    return this.prismaService.runInTransaction(async () => {
      try {
        const result: TInterfaceResult = await this.useCase.execute(port);
        
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