import { User } from '@core/domain/user/entity/User';
import { User as PrismaUser, UserRole } from '@prisma/client';
import { UserRole as DomainUserRole } from '@core/common/enums/UserEnums';

export class UserMapper {
  
  public static toDomainEntity(prismaUser: PrismaUser): User {
    const domainUser: User = new User({
      firstName : prismaUser.firstName || '',
      lastName  : prismaUser.lastName || '',
      email     : prismaUser.email || '',
      role      : prismaUser.role as DomainUserRole,
      password  : prismaUser.password || '',
      id        : prismaUser.id,
      createdAt : prismaUser.createdAt || new Date(),
      editedAt  : prismaUser.editedAt || undefined,
      removedAt : prismaUser.removedAt || undefined,
    });
    
    return domainUser;
  }
  
  public static toDomainEntities(prismaUsers: PrismaUser[]): User[] {
    return prismaUsers.map(prismaUser => this.toDomainEntity(prismaUser));
  }
  
  public static toPersistenceEntity(domainUser: User): Omit<PrismaUser, never> {
    return {
      id        : domainUser.getId(),
      firstName : domainUser.getFirstName(),
      lastName  : domainUser.getLastName(),
      email     : domainUser.getEmail(),
      role      : domainUser.getRole() as UserRole,
      password  : domainUser.getPassword(),
      createdAt : domainUser.getCreatedAt(),
      editedAt  : domainUser.getEditedAt(),
      removedAt : domainUser.getRemovedAt(),
    };
  }
  
  public static toPersistenceEntities(domainUsers: User[]): Omit<PrismaUser, never>[] {
    return domainUsers.map(domainUser => this.toPersistenceEntity(domainUser));
  }
  
}