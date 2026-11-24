import { ConflictException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import type { PrismaService } from './prisma.service';

export async function transaccionConReintento<T>(
  prisma: PrismaService,
  guardar: (tx: Prisma.TransactionClient) => Promise<T>,
  opciones?: {
    isolationLevel?: Prisma.TransactionIsolationLevel;
    timeout?: number;
  },
  mensajeConflicto = 'Cambió una referencia o el recurso. Volvé a intentar.',
): Promise<T> {
  for (let intento = 0; ; intento++) {
    try {
      return await prisma.$transaction(guardar, opciones);
    } catch (error) {
      if (
        !(error instanceof Prisma.PrismaClientKnownRequestError) ||
        error.code !== 'P2034'
      ) {
        throw error;
      }
      if (intento >= 2) {
        throw new ConflictException(mensajeConflicto);
      }
    }
  }
}
