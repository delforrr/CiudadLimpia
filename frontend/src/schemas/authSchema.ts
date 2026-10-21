import { z } from 'zod'

export const emailSchema = z.string()
  .trim()
  .toLowerCase()
  .min(1, 'Ingresá tu correo electrónico')
  .max(254, 'El correo no puede superar 254 caracteres')
  .pipe(z.email('Ingresá un correo válido, por ejemplo: nombre@correo.com'))

export const passwordSchema = z.string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .refine((password) => new TextEncoder().encode(password).length <= 72, {
    message: 'La contraseña no puede superar 72 bytes',
  })

export const authSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  rememberMe: z.boolean(),
})
