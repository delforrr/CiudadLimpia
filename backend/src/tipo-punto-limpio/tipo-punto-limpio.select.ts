import type { Prisma } from '../generated/prisma/client';

export const tipoPuntoLimpioSelect = {
  id: true,
  nombre: true,
  residuos: {
    select: {
      residuo: {
        select: { id: true, nombre: true },
      },
    },
    orderBy: { residuo: { nombre: 'asc' } },
  },
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
