import type { Prisma } from '../generated/prisma/client';
import { residuosDelTipoArgs } from '../tipo-punto-limpio-residuo/tipo-punto-limpio-residuo.select';

export const tipoPuntoLimpioSelect = {
  id: true,
  nombre: true,
  residuos: residuosDelTipoArgs,
} satisfies Prisma.TipoPuntoLimpioSelect;

export type TipoPuntoLimpioRecord = Prisma.TipoPuntoLimpioGetPayload<{
  select: typeof tipoPuntoLimpioSelect;
}>;

export function toTipoPuntoLimpioResponse(record: TipoPuntoLimpioRecord) {
  return {
    id: record.id,
    nombre: record.nombre,
    residuos: record.residuos.map(({ residuo }) => residuo),
  };
}
