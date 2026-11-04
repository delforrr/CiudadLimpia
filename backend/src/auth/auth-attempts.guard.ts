import {
  CanActivate,
  ExecutionContext,
  HttpException,
  Injectable,
} from '@nestjs/common';
import type { Request, Response } from 'express';

@Injectable()
export class AuthAttemptsGuard implements CanActivate {
  // shortcut: counters belong to one process; use a shared limiter when deploying multiple replicas.
  private readonly attempts = new Map<
    string,
    { count: number; until: number }
  >();

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    const now = Date.now();
    for (const [key, entry] of this.attempts) {
      if (entry.until <= now) this.attempts.delete(key);
    }
    const key = request.ip ?? 'unknown';
    const entry = this.attempts.get(key) ?? {
      count: 0,
      until: now + 15 * 60 * 1000,
    };
    this.attempts.set(key, entry);
    if (++entry.count > 10) {
      context
        .switchToHttp()
        .getResponse<Response>()
        .setHeader('Retry-After', Math.ceil((entry.until - now) / 1000));
      throw new HttpException('Demasiados intentos. Intentá más tarde.', 429);
    }
    return true;
  }
}
