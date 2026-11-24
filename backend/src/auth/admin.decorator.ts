import { applyDecorators, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiCookieAuth } from '@nestjs/swagger';
import { Role } from '../generated/prisma/enums';
import { AuthEndpointGuard } from './auth-endpoint.guard';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';

export function Admin() {
  return applyDecorators(
    Roles([Role.ADMIN]),
    UseGuards(AuthEndpointGuard, AuthGuard('jwt'), RolesGuard),
    ApiCookieAuth('session'),
    ApiBearerAuth(),
  );
}
