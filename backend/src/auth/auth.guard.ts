import { Injectable } from '@nestjs/common';
import { AuthGuard as PassportAuthGuard } from '@nestjs/passport';
import type { Request } from 'express';

export type AuthRequest = Request & { user: { id: string } };

@Injectable()
export class AuthGuard extends PassportAuthGuard('jwt') {}
