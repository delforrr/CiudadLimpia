import { z } from 'zod'
import { authSchema } from './authSchema.ts'
import { profileSchema } from './profileSchema.ts'

export const registerSchema = authSchema.extend({
  ...profileSchema.shape,
  repeatedPassword: z.string(),
}).refine((form) => form.password === form.repeatedPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['repeatedPassword'],
})
