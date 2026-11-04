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

  async findAll(buscar?: string, soloPuntosLimpios = false) {
    const texto = typeof buscar === 'string' ? buscar.trim() : undefined;
    const direcciones = await this.prisma.direccion.findMany({
      where: {
        ...(soloPuntosLimpios && { clienteId: null }),
        ...(texto && { direccion: { contains: texto, mode: 'insensitive' } }),
      },
      select: direccionSelect,
      orderBy: [{ direccion: 'asc' }, { id: 'asc' }],
      take: 20,
    });
    return direcciones.map(toDireccionResponse);
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
          if (altura === null || (dto.calle === undefined && !calleId))
            throw new BadRequestException(
              'Indica calle y altura para completar la direccion',
            );
          const direccion = dto.calle === undefined
            ? await this.buildDireccionDataForCalle(tx, calleId!, altura)
            : await this.buildDireccionData(tx, { calle: dto.calle, altura });
          const cambio = altura !== actual.altura || direccion.calleId !== calleId;
          const reinicio = cambio ? { lat: null, long: null } : {};
          data = { ...direccion, ...reinicio, ...ubicacion };
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

  private async buildDireccionDataForCalle(
    tx: Prisma.TransactionClient,
    calleId: string,
    altura: number,
  ) {
    // Serializa el cambio de altura con el renombre de la calle.
    const [calle] = await tx.$queryRaw<{ calle: string }[]>`
      SELECT "calle" FROM "Calle" WHERE "id" = ${calleId} FOR UPDATE
    `;
    if (!calle) throw new NotFoundException('Calle no encontrada');
    return { calleId, altura, direccion: `${calle.calle} ${altura}` };
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
    const clave = claveCalle(dto.calle);
    const calle = await tx.calle.upsert({
      where: { clave },
      create: { clave, calle: dto.calle },
      update: { clave },
    });
    return {
      calleId: calle.id,
      altura: dto.altura,
      direccion: `${calle.calle} ${dto.altura}`,
    };
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
