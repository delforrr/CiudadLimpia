import { BadRequestException, Injectable } from '@nestjs/common';
import {
  referenciaConPin,
  resolverDireccion,
} from '../direccion/direccion-referencia';
import type { Prisma } from '../generated/prisma/client';
import type { CreatePuntoTrayectoDto } from './punto-trayecto.dto';

@Injectable()
export class PuntosTrayectoService {
  ordenar(puntos: readonly CreatePuntoTrayectoDto[]) {
    const ordenados = [...puntos].sort((a, b) => a.orden - b.orden);
    if (ordenados.some((punto, indice) => punto.orden !== indice)) {
      throw new BadRequestException(
        'El orden de puntos debe empezar en cero y ser consecutivo',
      );
    }

    return ordenados;
  }

  async resolverReferencias(
    tx: Prisma.TransactionClient,
    puntos: readonly CreatePuntoTrayectoDto[],
  ) {
    const referencias: Prisma.PuntoTrayectoUncheckedCreateWithoutTrayectoInput[] =
      [];
    for (const punto of puntos) {
      const { id } = await resolverDireccion(tx, referenciaConPin(punto));
      referencias.push({ orden: punto.orden, direccionId: id });
    }
    return referencias;
  }
}
