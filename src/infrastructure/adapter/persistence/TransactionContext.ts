import { AsyncLocalStorage } from 'async_hooks';
import { Prisma } from '@prisma/client';

export class TransactionContext {
  private static storage: AsyncLocalStorage<Prisma.TransactionClient> = new AsyncLocalStorage<Prisma.TransactionClient>();

  /**
   * Get the current transaction client from the async context
   * @returns Transaction client if within transaction context, undefined otherwise
   */
  static getTransaction(): Prisma.TransactionClient | undefined {
    return this.storage.getStore();
  }

  /**
   * Run a function within a transaction context
   * @param transaction - The transaction client to use
   * @param fn - The function to execute within the transaction context
   * @returns The result of the function execution
   */
  static async run<T>(
    transaction: Prisma.TransactionClient, 
    fn: () => Promise<T>
  ): Promise<T> {
    return this.storage.run(transaction, fn);
  }
}