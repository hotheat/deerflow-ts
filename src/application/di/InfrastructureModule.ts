import { NestHttpExceptionFilter } from '@application/api/http-rest/exception-filter/NestHttpExceptionFilter';
import { NestHttpLoggingInterceptor } from '@application/api/http-rest/interceptor/NestHttpLoggingInterceptor';
import { ApiServerConfig } from '@infrastructure/config/ApiServerConfig';
import { Global, Module, Provider } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';

const providers: Provider[] = [
  {
    provide : APP_FILTER,
    useClass: NestHttpExceptionFilter,
  }
];

if (ApiServerConfig.LOG_ENABLE) {
  providers.push({
    provide : APP_INTERCEPTOR,
    useClass: NestHttpLoggingInterceptor,
  });
}

@Global()
@Module({
  imports: [],
  providers: providers,
  exports: []
})
export class InfrastructureModule {}
