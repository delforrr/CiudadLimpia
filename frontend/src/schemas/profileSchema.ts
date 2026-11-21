import { z } from 'zod'
import { emailSchema, lastNameSchema, nameSchema } from './authSchema.ts'
import type { Coordenadas } from '../services/trayectosService.ts'
import { coordenadasDomicilioSchema } from '../services/domicilioUbicacionService.ts'

export const domicilioSchema = z.object({
  direccion: z.string().trim().min(1, 'Ingresá una dirección').max(200, 'Cada dirección puede tener hasta 200 caracteres'),
  etiqueta: z.string().trim().max(100, 'La etiqueta puede tener hasta 100 caracteres').nullish(),
})

const frenteSchema = z.object({
  calle: z.string().trim().min(1, 'Ingresá la calle').max(180, 'La calle puede tener hasta 180 caracteres'),
  altura: z.int().min(1, 'Ingresá una altura mayor a cero').max(2147483647, 'La altura supera el máximo permitido'),
})

export const nuevoDomicilioSchema = z.object({
  calle: frenteSchema.shape.calle,
  altura: z.string().trim().regex(/^[0-9]+$/, 'Ingresá la altura en números').transform(Number).pipe(frenteSchema.shape.altura),
  etiqueta: domicilioSchema.shape.etiqueta,
}).transform(({ calle, altura, etiqueta }) => ({
  direccion: `${calle} ${altura}`,
  frente: { calle, altura },
  etiqueta,
}))

export type NuevoDomicilioForm = z.input<typeof nuevoDomicilioSchema> & { ubicacion?: Coordenadas }

export const profileSchema = z.object({
  name: nameSchema,
  lastName: lastNameSchema,
  email: emailSchema,
  domicilios: z.array(domicilioSchema)
    .min(1, 'Ingresá al menos un domicilio')
    .max(20, 'Podés cargar hasta 20 domicilios'),
})

const referenciaDomicilioSchema = z.union([
  domicilioSchema.extend({ id: z.uuid() }).transform(({ id, etiqueta }) => ({ direccionId: id, etiqueta })),
  domicilioSchema.extend({ frente: frenteSchema, ubicacion: coordenadasDomicilioSchema })
    .transform(({ frente, ubicacion, etiqueta }) => ({ direccion: { ...frente, ...ubicacion }, etiqueta })),
])

export const profileUpdateSchema = profileSchema.extend({
  domicilios: z.array(referenciaDomicilioSchema)
    .min(1, 'Ingresá al menos un domicilio')
    .max(20, 'Podés cargar hasta 20 domicilios'),
})

export type DomicilioReferencia = z.output<typeof referenciaDomicilioSchema>
export type DomicilioForm = z.input<typeof domicilioSchema> & {
  id?: string
  frente?: z.infer<typeof frenteSchema>
  ubicacion?: Coordenadas
}
