import { Module } from '@nestjs/common';
import { ContextService } from './context.service';
import { AuditContextInterceptor } from './context.interceptor';

@Module({
  providers: [AuditContextInterceptor, ContextService],
  exports: [AuditContextInterceptor, ContextService],
})
export class ContextModule {}
