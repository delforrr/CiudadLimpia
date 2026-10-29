import { z } from 'zod'

export const nameSchema = z.string()
  .trim()
  .min(1, 'Ingresá tu nombre')
  .max(100, 'El nombre no puede superar 100 caracteres')

export const lastNameSchema = z.string()
  .trim()
  .min(1, 'Ingresá tu apellido')
  .max(100, 'El apellido no puede superar 100 caracteres')

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

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  rememberMe: z.boolean(),
})

export const authSchema = loginSchema

export const registerSchema = z.object({
  name: nameSchema,
  lastName: lastNameSchema,
  email: emailSchema,
  password: passwordSchema,
  repeatedPassword: z.string().min(1, 'Repetí tu contraseña'),
}).refine((data) => data.password === data.repeatedPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['repeatedPassword'],
})

