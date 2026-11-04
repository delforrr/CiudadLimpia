import type { Request } from 'express';
import type { Role } from '../generated/prisma/enums';

export type AuthRequest = Request & { user: { id: string; role: Role } };
