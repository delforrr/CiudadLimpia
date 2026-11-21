import {
  direccionSelect,
  toDireccionResponse,
} from '../direccion/direcciones.select';
import type { Prisma } from '../generated/prisma/client';

export const publicUserSelect = {
  id: true,
  email: true,
  role: true,
  cliente: {
    select: {
      id: true,
      name: true,
      lastName: true,
      domicilios: {
        select: { direccion: { select: direccionSelect }, etiqueta: true },
        orderBy: { direccionId: 'asc' },
      },
    },
  },
} as const satisfies Prisma.UserSelect;

export function toUserResponse({
  id,
  email,
  role,
  cliente,
}: Prisma.UserGetPayload<{ select: typeof publicUserSelect }>) {
  return {
    id,
    email,
    role,
    cliente: cliente && {
      ...cliente,
      domicilios: cliente.domicilios.map(({ direccion, etiqueta }) => ({
        ...toDireccionResponse(direccion),
        etiqueta,
      })),
    },
  };
}
