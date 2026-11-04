import { z } from 'zod';
import {
  clienteSchema,
  emailSchema,
  passwordSchema,
} from '../accounts/account.schemas';

export const loginSchema = z.strictObject({
  email: emailSchema,
  password: passwordSchema,
  rememberMe: z.boolean().optional(),
});
export const registerSchema = z.strictObject({
  email: emailSchema,
  password: passwordSchema,
  cliente: clienteSchema,
});
export type LoginRequest = z.infer<typeof loginSchema>;
export type RegisterRequest = z.infer<typeof registerSchema>;
