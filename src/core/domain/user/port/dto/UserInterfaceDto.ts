import { Expose } from 'class-transformer';
import { UserRole } from '@core/common/enums/UserEnums';
import { Nullable } from '@core/common/type/CommonTypes';
import { User } from '@core/domain/user/entity/User';

export class UserInterfaceDto {
  
  @Expose()
  public id: string;
  
  @Expose()
  public firstName: string;
  
  @Expose()
  public lastName: string;
  
  @Expose()
  public email: string;
  
  @Expose()
  public role: UserRole;
  
  @Expose()
  public createdAt: Date;
  
  @Expose()
  public editedAt: Nullable<Date>;
  
  @Expose()
  public removedAt: Nullable<Date>;
  
  public static newFromUser(user: User): UserInterfaceDto {
    const dto: UserInterfaceDto = new UserInterfaceDto();
    
    dto.id = user.getId();
    dto.firstName = user.getFirstName();
    dto.lastName = user.getLastName();
    dto.email = user.getEmail();
    dto.role = user.getRole();
    dto.createdAt = user.getCreatedAt();
    dto.editedAt = user.getEditedAt();
    dto.removedAt = user.getRemovedAt();
    
    return dto;
  }

  public static newListFromUsers(users: User[]): UserInterfaceDto[] {
    return users.map(user => this.newFromUser(user));
  }
}