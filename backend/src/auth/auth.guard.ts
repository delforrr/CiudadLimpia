import { Injectable } from '@nestjs/common';
import { AuthGuard as PassportAuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import type { Role } from '../generated/prisma/enums';

export type AuthRequest = Request & { user: { id: string; role: Role } };

@Injectable()
export class AuthGuard extends PassportAuthGuard('jwt') {}
