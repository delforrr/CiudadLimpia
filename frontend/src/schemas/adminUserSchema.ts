import { z } from 'zod'
import { profileUpdateSchema } from './profileSchema.ts'
import { passwordSchema } from './authSchema.ts'

export const adminUserSchema = profileUpdateSchema.extend({
  role: z.enum(['USER', 'ADMIN']),
})

export const adminUserCreateSchema = adminUserSchema.extend({
  password: passwordSchema,
  repeatedPassword: z.string().min(1, 'Repetí la contraseña'),
}).refine((data) => data.password === data.repeatedPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['repeatedPassword'],
})
