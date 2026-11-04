import { InternalServerErrorException } from '@nestjs/common';
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
        select: { id: true, direccion: true, etiqueta: true },
        orderBy: { id: 'asc' },
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
      domicilios: cliente.domicilios.map((domicilio) => {
        if (domicilio.direccion === null)
          throw new InternalServerErrorException('Domicilio sin texto');
        return { ...domicilio, direccion: domicilio.direccion };
      }),
    },
  };
}
