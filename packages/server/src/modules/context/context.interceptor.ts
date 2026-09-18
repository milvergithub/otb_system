import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { ContextService } from './context.service';

@Injectable()
export class AuditContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const user = request.user as { id?: string } | undefined;

    return ContextService.run(
      {
        userId: user?.id ?? null,
        ipAddress: request.ip ?? request.socket?.remoteAddress ?? null,
        userAgent: request.headers['user-agent'] ?? null,
      },
      () => next.handle(),
    );
  }
}
