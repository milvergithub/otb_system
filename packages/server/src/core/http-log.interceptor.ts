import {
  CallHandler,
  ExecutionContext,
  Inject,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Observable, tap } from 'rxjs';
import { Logger } from 'winston';

@Injectable()
export class HttpLogInterceptor implements NestInterceptor {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const start = Date.now();
    const method = request.method;
    const url = request.originalUrl ?? request.url;
    const user = request.user as { id?: string } | undefined;

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse();
          this.logger.http('Request completed', {
            method,
            url,
            status: response.statusCode,
            durationMs: Date.now() - start,
            userId: user?.id ?? null,
          });
        },
        error: (err: unknown) => {
          const httpErr = err as {
            status?: number;
            statusCode?: number;
            message?: string;
          };
          const status = httpErr.status ?? httpErr.statusCode ?? 500;
          this.logger.error('Request failed', {
            message: httpErr.message ?? String(err),
            method,
            url,
            status,
            durationMs: Date.now() - start,
            userId: user?.id ?? null,
          });
        },
      }),
    );
  }
}
