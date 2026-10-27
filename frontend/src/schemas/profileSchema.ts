import { z } from 'zod'
import { emailSchema } from './authSchema.ts'

export const profileSchema = z.object({
  name: z.string().trim().min(1, 'Ingresá tu nombre').max(100, 'El nombre no puede superar 100 caracteres'),
  lastName: z.string().trim().min(1, 'Ingresá tu apellido').max(100, 'El apellido no puede superar 100 caracteres'),
  email: emailSchema,
  domicilios: z.array(z.object({
    direccion: z.string().trim().min(1, 'Ingresá una dirección').max(200, 'Cada dirección puede tener hasta 200 caracteres'),
    etiqueta: z.string().trim().max(100, 'La etiqueta puede tener hasta 100 caracteres').nullish(),
  }))
    .min(1, 'Ingresá al menos un domicilio')
    .max(20, 'Podés cargar hasta 20 domicilios'),
})
