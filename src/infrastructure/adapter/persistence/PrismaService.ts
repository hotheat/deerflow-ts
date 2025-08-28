import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import { TransactionContext } from '@infrastructure/adapter/persistence/TransactionContext';
import { DatabaseConfig } from '@infrastructure/config/DatabaseConfig';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    super({
      datasources: {
        db: {
          url: `postgresql://${DatabaseConfig.DB_USERNAME}:${DatabaseConfig.DB_PASSWORD}@${DatabaseConfig.DB_HOST}:${DatabaseConfig.DB_PORT}/${DatabaseConfig.DB_NAME}`,
        },
      },
      log: DatabaseConfig.DB_LOG_ENABLE ? ['query', 'info', 'warn', 'error'] : [],
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  /**
   * Run a function within a Prisma transaction
   * @param fn - Function to execute within transaction context
   * @returns Promise with the result of the function
   */
  async runInTransaction<T>(fn: () => Promise<T>): Promise<T> {
    return this.$transaction(async (transaction) => {
      return TransactionContext.run(transaction, fn);
    });
  }

  /**
   * Get the appropriate client (transaction client if in transaction, otherwise default client)
   * @returns PrismaClient or transaction client
   */
  getClient(): PrismaClient | Prisma.TransactionClient {
    return TransactionContext.getTransaction() || this;
  }
}