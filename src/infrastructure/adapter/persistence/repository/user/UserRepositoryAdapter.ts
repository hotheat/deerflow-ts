import { Injectable } from '@nestjs/common';
import { RepositoryFindOptions } from '@core/common/persistence/RepositoryOptions';
import { Optional } from '@core/common/type/CommonTypes';
import { User } from '@core/domain/user/entity/User';
import { UserRepositoryPort } from '@core/domain/user/port/persistence/UserRepositoryPort';
import { PrismaService } from '@infrastructure/adapter/persistence/PrismaService';
import { UserMapper } from '@infrastructure/adapter/persistence/repository/mapper/UserMapper';
import { PrismaClient, Prisma } from '@prisma/client';

@Injectable()
export class UserRepositoryAdapter implements UserRepositoryPort {
  
  constructor(
    private readonly prismaService: PrismaService,
  ) {}
  
  public async findUser(by: {id?: string, email?: string}, options: RepositoryFindOptions = {}): Promise<Optional<User>> {
    const client: PrismaClient | Prisma.TransactionClient = this.prismaService.getClient();
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const whereCondition: Prisma.UserWhereInput = {};
    
    if (by.id) {
      whereCondition.id = by.id;
    }
    
    if (by.email) {
      whereCondition.email = by.email;
    }
    
    if (!options.includeRemoved) {
      whereCondition.removedAt = null;
    }
    
    const prismaUser: Prisma.UserGetPayload<Record<string, never>> | null = await client.user.findFirst({
      where: whereCondition
    });
    
    if (!prismaUser) {
      return undefined;
    }
    
    return UserMapper.toDomainEntity(prismaUser);
  }
  
  public async countUsers(by: {id?: string, email?: string}, options: RepositoryFindOptions = {}): Promise<number> {
    const client: PrismaClient | Prisma.TransactionClient = this.prismaService.getClient();
    
    const whereCondition: Prisma.UserWhereInput = {};
    
    if (by.id) {
      whereCondition.id = by.id;
    }
    
    if (by.email) {
      whereCondition.email = by.email;
    }
    
    if (!options.includeRemoved) {
      whereCondition.removedAt = null;
    }
    
    return client.user.count({
      where: whereCondition
    });
  }
  
  public async addUser(user: User): Promise<{id: string}> {
    const client: PrismaClient | Prisma.TransactionClient = this.prismaService.getClient();
    const userData: Prisma.UserCreateInput = UserMapper.toPersistenceEntity(user);
    
    const createdUser: Prisma.UserGetPayload<Record<string, never>> = await client.user.create({
      data: userData
    });
    
    return {
      id: createdUser.id
    };
  }
  
  public async updateUser(user: User): Promise<void> {
    const client: PrismaClient | Prisma.TransactionClient = this.prismaService.getClient();
    const userData: Prisma.UserUpdateInput = UserMapper.toPersistenceEntity(user);
    
    await client.user.update({
      where: { id: user.getId() },
      data: userData
    });
  }
  
}