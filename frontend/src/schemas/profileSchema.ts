import { z } from 'zod'
import { emailSchema, lastNameSchema, nameSchema } from './authSchema.ts'

export const domicilioSchema = z.object({
  direccion: z.string().trim().min(1, 'Ingresá una dirección').max(200, 'Cada dirección puede tener hasta 200 caracteres'),
  etiqueta: z.string().trim().max(100, 'La etiqueta puede tener hasta 100 caracteres').nullish(),
})

export const nuevoDomicilioSchema = z.object({
  calle: z.string().trim().min(1, 'Ingresá la calle'),
  altura: z.string().trim().regex(/^[0-9]+$/, 'Ingresá la altura en números'),
  etiqueta: domicilioSchema.shape.etiqueta,
}).refine(({ calle, altura }) => calle.length + altura.length + 1 <= 200, {
  path: ['calle'],
  message: 'La calle y la altura juntas pueden tener hasta 200 caracteres',
}).transform(({ calle, altura, etiqueta }) => ({
  direccion: `${calle} ${altura}`,
  etiqueta,
}))

export type NuevoDomicilioForm = z.input<typeof nuevoDomicilioSchema>

export const profileSchema = z.object({
  name: nameSchema,
  lastName: lastNameSchema,
  email: emailSchema,
  domicilios: z.array(domicilioSchema)
    .min(1, 'Ingresá al menos un domicilio')
    .max(20, 'Podés cargar hasta 20 domicilios'),
})

export type DomicilioForm = z.input<typeof domicilioSchema> & { id?: string }
