import type { Prisma } from '../generated/prisma/client';

export const direccionSelect = {
  id: true,
  direccion: true,
  calle: { select: { calle: true } },
  altura: true,
} satisfies Prisma.DireccionSelect;

type DireccionRecord = Prisma.DireccionGetPayload<{
  select: typeof direccionSelect;
}>;

export function toDireccionResponse({ calle, ...direccion }: DireccionRecord) {
  return { ...direccion, calle: calle?.calle ?? null };
}
