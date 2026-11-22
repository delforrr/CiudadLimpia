import { z } from 'zod';
import {
  clienteSchema,
  emailSchema,
  passwordSchema,
  roleSchema,
  updateClienteSchema,
} from '../accounts/account.schemas';

export const createUserSchema = z.strictObject({
  email: emailSchema,
  password: passwordSchema,
  role: roleSchema,
  cliente: clienteSchema,
});
export const updateUserSchema = z.strictObject({
  email: emailSchema.optional(),
  password: passwordSchema.optional(),
  role: roleSchema.optional(),
  cliente: updateClienteSchema.optional(),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
