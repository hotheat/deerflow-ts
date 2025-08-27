import { HttpAuthService } from '@application/api/http-rest/auth/HttpAuthService';
import { HttpJwtPayload, HttpUserPayload } from '@application/api/http-rest/auth/type/HttpAuthTypes';
import { Code } from '@core/common/code/Code';
import { Exception } from '@core/common/exception/Exception';
import { CoreAssert } from '@core/common/util/assert/CoreAssert';
import { User } from '@core/domain/user/entity/User';
import { ApiServerConfig } from '@infrastructure/config/ApiServerConfig';
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class HttpJwtStrategy extends PassportStrategy(Strategy) {
  
  constructor(private authService: HttpAuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromHeader(ApiServerConfig.ACCESS_TOKEN_HEADER),
      ignoreExpiration: false,
      secretOrKey: ApiServerConfig.ACCESS_TOKEN_SECRET,
    });
  }
  
  public async validate(payload: HttpJwtPayload): Promise<HttpUserPayload> {
    const user: User = CoreAssert.notEmpty(
      await this.authService.getUser({id: payload.id}),
      Exception.new({code: Code.UNAUTHORIZED_ERROR})
    );

    //  1. 当 validate 方法返回用户信息时
    //  2. Passport 会自动将返回值赋给 request.user
    //  3. 这是 Passport 的内置功能，不需要手动编码
  
    return {id: user.getId(), email: user.getEmail(), role: user.getRole()};
  }
  
}
