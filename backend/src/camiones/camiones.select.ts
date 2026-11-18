import type { Prisma } from '../generated/prisma/client';

export const camionSelect = {
  id: true,
  patente: true,
  marca: true,
  modelo: true,
  estado: true,
} as const satisfies Prisma.CamionSelect;

export type CamionRecord = Prisma.CamionGetPayload<{
  select: typeof camionSelect;
}>;
