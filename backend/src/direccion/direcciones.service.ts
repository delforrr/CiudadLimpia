import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { claveCalle } from '../calle/calle.dto';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { parCoordenadas, resolverCalleId } from './direccion-referencia';
import { direccionSelect, toDireccionResponse } from './direcciones.select';
import type { CreateDireccionDto } from './dto/create-direccion.dto';
import type { DireccionResponseDto } from './dto/direccion-response.dto';
import type { UpdateDireccionDto } from './dto/update-direccion.dto';

@Injectable()
export class DireccionesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(buscar?: string) {
    const texto = typeof buscar === 'string' ? buscar.trim() : '';
    return this.prisma.$queryRaw<DireccionResponseDto[]>`
      SELECT d."id", c."calle", d."altura", d."lat", d."long",
             concat_ws(' ', c."calle", d."altura") AS "direccion"
      FROM "Direccion" d
      JOIN "Calle" c ON c."id" = d."calleId"
      ${texto ? Prisma.sql`WHERE strpos(lower(concat_ws(' ', c."calle", d."altura")), lower(${texto})) > 0` : Prisma.empty}
      ORDER BY "direccion", d."id"
      LIMIT 20
    `;
  }

  async findOne(id: string) {
    const direccion = await this.prisma.direccion.findUnique({
      where: { id },
      select: direccionSelect,
    });
    if (!direccion) throw new NotFoundException('Dirección no encontrada');
    return toDireccionResponse(direccion);
  }

  create({ calle, ...ubicacion }: CreateDireccionDto) {
    return this.prisma.$transaction(async (tx) => {
      const calleId = await resolverCalleId(tx, calle);
      const data = { calleId, ...ubicacion };
      return toDireccionResponse(
        await tx.direccion.create({ data, select: direccionSelect }),
      );
    });
  }

  async update(id: string, dto: UpdateDireccionDto) {
    const ubicacion = parCoordenadas(dto);
    return this.prisma.$transaction(async (tx) => {
      const actual = await tx.direccion.findUnique({
        where: { id },
        select: direccionSelect,
      });
      if (!actual) throw new NotFoundException('Dirección no encontrada');
      if (
        (dto.calle !== undefined &&
          claveCalle(dto.calle) !== claveCalle(actual.calle.calle)) ||
        (dto.altura !== undefined && dto.altura !== actual.altura)
      ) {
        throw new BadRequestException(
          'La calle y la altura deben coincidir con la dirección registrada',
        );
      }
      if (!ubicacion) return toDireccionResponse(actual);
      return toDireccionResponse(
        await tx.direccion.update({
          where: { id },
          data: ubicacion,
          select: direccionSelect,
        }),
      );
    });
  }

  async remove(id: string) {
    await this.prisma.direccion.delete({ where: { id } });
  }
}
