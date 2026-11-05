import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { claveCalle } from '../calle/calle.dto';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { direccionSelect, toDireccionResponse } from './direcciones.select';
import type { CreateDireccionDto } from './dto/create-direccion.dto';
import type { DireccionResponseDto } from './dto/direccion-response.dto';
import type { UpdateDireccionDto } from './dto/update-direccion.dto';

function coordenadas({ lat, long }: UpdateDireccionDto) {
  if (lat === undefined && long === undefined) return {};
  if (
    lat === undefined ||
    long === undefined ||
    (lat === null) !== (long === null)
  )
    throw new BadRequestException('Enviá lat y long juntas o ambas nulas');
  return { lat, long };
}

@Injectable()
export class DireccionesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(buscar?: string, soloPuntosLimpios = false) {
    const texto = typeof buscar === 'string' ? buscar.trim() : '';
    return this.prisma.$queryRaw<DireccionResponseDto[]>`
      SELECT *
      FROM (
        SELECT d."id", c."calle", d."altura", d."lat", d."long",
               COALESCE(d."direccion", c."calle" || ' ' || d."altura") AS "direccion"
        FROM "Direccion" d
        LEFT JOIN "Calle" c ON c."id" = d."calleId"
        ${soloPuntosLimpios ? Prisma.sql`WHERE d."clienteId" IS NULL` : Prisma.empty}
      ) AS catalogo
      ${texto ? Prisma.sql`WHERE strpos(lower("direccion"), lower(${texto})) > 0` : Prisma.empty}
      ORDER BY "direccion", "id"
      LIMIT 20
    `;
  }

  async findOne(id: string) {
    const direccion = await this.prisma.direccion.findUnique({
      where: { id },
      select: direccionSelect,
    });
    if (!direccion) throw new NotFoundException('Direccion no encontrada');
    return toDireccionResponse(direccion);
  }

  async create(dto: CreateDireccionDto) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const data = {
          ...coordenadas(dto),
          ...(await this.buildDireccionData(tx, dto)),
        };
        return toDireccionResponse(
          await tx.direccion.create({ data, select: direccionSelect }),
        );
      });
    } catch (error: unknown) {
      this.rethrow(error);
    }
  }

  async resolveForPuntoLimpio(
    tx: Prisma.TransactionClient,
    dto: CreateDireccionDto,
  ) {
    const data = {
      ...coordenadas(dto),
      ...(await this.buildDireccionData(tx, dto)),
    };
    return tx.direccion.upsert({
      where: { calleId_altura: { calleId: data.calleId, altura: data.altura } },
      create: data,
      update: { altura: data.altura },
      select: { id: true },
    });
  }

  async update(id: string, dto: UpdateDireccionDto) {
    const ubicacion = coordenadas(dto);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const actual = await tx.direccion.findUnique({
          where: { id, clienteId: null },
          select: { ...direccionSelect, calleId: true },
        });
        if (!actual) throw new NotFoundException('Direccion no encontrada');
        const { calleId, ...registro } = actual;
        let data = ubicacion;
        if (dto.calle !== undefined || dto.altura !== undefined) {
          const altura = dto.altura ?? actual.altura;
          const nuevaCalleId =
            dto.calle === undefined
              ? calleId
              : await this.resolveCalleId(tx, dto.calle);
          if (altura === null || !nuevaCalleId)
            throw new BadRequestException(
              'Indica calle y altura para completar la direccion',
            );
          const cambio = altura !== actual.altura || nuevaCalleId !== calleId;
          const reinicio = cambio ? { lat: null, long: null } : {};
          data = {
            ...{ calleId: nuevaCalleId, altura, direccion: null },
            ...reinicio,
            ...ubicacion,
          };
        } else if (dto.lat === undefined) {
          return toDireccionResponse(registro);
        }
        return toDireccionResponse(
          await tx.direccion.update({
            where: { id, clienteId: null },
            data,
            select: direccionSelect,
          }),
        );
      });
    } catch (error: unknown) {
      this.rethrow(error);
    }
  }

  async remove(id: string) {
    try {
      await this.prisma.direccion.delete({ where: { id, clienteId: null } });
    } catch (error: unknown) {
      this.rethrow(error);
    }
  }

  private async buildDireccionData(
    tx: Prisma.TransactionClient,
    dto: CreateDireccionDto,
  ) {
    return {
      calleId: await this.resolveCalleId(tx, dto.calle),
      altura: dto.altura,
    };
  }

  private async resolveCalleId(tx: Prisma.TransactionClient, nombre: string) {
    const clave = claveCalle(nombre);
    const calle = await tx.calle.upsert({
      where: { clave },
      create: { clave, calle: nombre },
      update: { clave },
      select: { id: true },
    });
    return calle.id;
  }

  private rethrow(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002')
        throw new ConflictException('La direccion ya existe');
      if (error.code === 'P2003')
        throw new ConflictException('La direccion esta en uso');
      if (error.code === 'P2025')
        throw new NotFoundException('Direccion no encontrada');
    }
    throw error;
  }
}
