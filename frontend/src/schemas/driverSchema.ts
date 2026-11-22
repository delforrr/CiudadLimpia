import { z } from 'zod'

export const driverSchema = z.object({
  nombre: z.string().trim().min(1, 'Ingresá el nombre').max(100, 'El nombre no puede superar 100 caracteres'),
  apellido: z.string().trim().min(1, 'Ingresá el apellido').max(100, 'El apellido no puede superar 100 caracteres'),
  activo: z.boolean(),
})
