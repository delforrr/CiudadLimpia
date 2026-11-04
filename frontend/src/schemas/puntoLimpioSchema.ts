import { z } from 'zod'

export const puntoLimpioSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(1, 'Ingresá el nombre del punto')
    .max(100, 'El nombre no puede superar 100 caracteres'),
  tipoId: z.string().trim().min(1, 'Seleccioná un tipo de punto'),
  direccion: z
    .string()
    .trim()
    .min(1, 'Ingresá la dirección')
    .max(200, 'La dirección no puede superar 200 caracteres'),
  estado: z.enum(['ACTIVO', 'INACTIVO']),
})
