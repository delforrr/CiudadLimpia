import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { AuthRequest } from '../auth/auth.guard';
import { Role } from '../generated/prisma/enums';

@Injectable()
export class UserAccessGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthRequest>();
    if (request.user.role === Role.ADMIN) return true;
    const body = request.body as { role?: unknown } | undefined;
    return (
      request.user.id === request.params.id &&
      (request.method !== 'PATCH' || body?.role === undefined)
    );
  }
}
