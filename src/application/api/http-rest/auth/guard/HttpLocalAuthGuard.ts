import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

//  HttpLocalStrategy 继承自 PassportStrategy(Strategy)
// 默认策略名称：'local'
// AuthGuard('local') 中的 'local' 就是策略名称
@Injectable()
export class HttpLocalAuthGuard extends AuthGuard('local') {}
