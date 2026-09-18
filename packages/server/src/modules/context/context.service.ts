import { AsyncLocalStorage } from 'async_hooks';

export interface RequestContext {
  userId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
}

const storage = new AsyncLocalStorage<RequestContext>();

export class ContextService {
  static get currentContext(): RequestContext | undefined {
    return storage.getStore();
  }

  static run<T>(context: RequestContext, fn: () => T): T {
    return storage.run(context, fn);
  }
}
