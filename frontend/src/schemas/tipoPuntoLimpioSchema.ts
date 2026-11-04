import { z } from 'zod'

export const tipoPuntoLimpioSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(1, 'Ingresá el nombre del tipo')
    .max(50, 'El nombre no puede superar 50 caracteres'),
  materiales: z
    .array(
      z
        .string()
        .trim()
        .min(1, 'Completá o eliminá los materiales vacíos')
        .max(50, 'Cada material puede tener hasta 50 caracteres'),
    )
    .min(1, 'Agregá al menos un material')
    .max(20, 'Un tipo puede tener hasta 20 materiales'),
  logo: z.string().optional(),
  colorFondo: z.string().regex(/^#[0-9a-f]{6}$/i, 'Elegí un color de fondo válido').optional(),
})
