import type { Prisma } from '../generated/prisma/client';

export const residuosDelTipoArgs = {
  select: {
    residuo: {
      select: { id: true, nombre: true },
    },
  },
  orderBy: { residuo: { nombre: 'asc' } },
} satisfies Prisma.TipoPuntoLimpio$residuosArgs;
