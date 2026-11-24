import { z } from 'zod';
import type { Recorrido } from './cobertura-trayecto';
import { esLineaValida } from './line-string';
import { LadoRecoleccion } from '../generated/prisma/enums';

const recorridoSchema = z.object({
  geometria: z.custom<Recorrido['geometria']>(esLineaValida),
  tramos: z
    .array(
      z.object({
        calleId: z.string().min(1),
        desde: z.int().nonnegative(),
        hasta: z.int().positive(),
        lado: z.enum(LadoRecoleccion).optional(),
      }),
    )
    .optional(),
});

export function leerRecorrido(datos: unknown): Recorrido | null {
  const resultado = recorridoSchema.safeParse(datos);
  if (!resultado.success) return null;
  const { geometria, tramos = [] } = resultado.data;
  if (
    tramos.some(
      ({ desde, hasta }) =>
        desde >= hasta || hasta >= geometria.coordinates.length,
    )
  )
    return null;
  return { geometria, tramos };
}
