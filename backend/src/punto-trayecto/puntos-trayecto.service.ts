import { BadRequestException, Injectable } from '@nestjs/common';
import { DireccionesService } from '../direccion/direcciones.service';
import type { Prisma } from '../generated/prisma/client';
import type { CreatePuntoTrayectoDto } from './punto-trayecto.dto';

@Injectable()
export class PuntosTrayectoService {
  constructor(private readonly direcciones: DireccionesService) {}

  ordenar(puntos: readonly CreatePuntoTrayectoDto[]) {
    const ordenados = [...puntos].sort((a, b) => a.orden - b.orden);
    if (ordenados.some((punto, indice) => punto.orden !== indice)) {
      throw new BadRequestException(
        'El orden de puntos debe empezar en cero y ser consecutivo',
      );
    }

    for (const punto of ordenados) {
      if (punto.direccion && punto.direccionId) {
        throw new BadRequestException(
          'Enviá direccionId o direccion, solo uno',
        );
      }
    }
    return ordenados;
  }

  async resolverReferencias(
    tx: Prisma.TransactionClient,
    puntos: readonly CreatePuntoTrayectoDto[],
  ) {
    const referencias: Prisma.PuntoTrayectoUncheckedCreateWithoutTrayectoInput[] =
      [];
    for (const { orden, lat, long, direccion, direccionId } of puntos) {
      const referencia = await this.direcciones.resolveForTrayecto(tx, {
        lat,
        long,
        direccion,
        direccionId,
      });
      referencias.push({ orden, lat, long, direccionId: referencia.id });
    }
    return referencias;
  }

  async eliminarDeTrayecto(tx: Prisma.TransactionClient, trayectoId: string) {
    await tx.puntoTrayecto.deleteMany({ where: { trayectoId } });
  }
}
