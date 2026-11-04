import type { Prisma } from '../generated/prisma/client';

export const puntoLimpioSelect = {
  id: true,
  nombre: true,
  tipoId: true,
  direccionId: true,
  lat: true,
  long: true,
} as const satisfies Prisma.PuntoLimpioSelect;
