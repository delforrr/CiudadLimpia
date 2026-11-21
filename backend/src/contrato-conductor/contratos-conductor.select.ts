import type { Prisma } from '../generated/prisma/client';

export const contratoConductorSelect = {
  idCamion: true,
  idConductor: true,
  fechaInicio: true,
  fechaFin: true,
} as const satisfies Prisma.ContratoConductorSelect;
