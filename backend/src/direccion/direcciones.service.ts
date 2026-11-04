import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDireccionDto, UpdateDireccionDto } from './dto/direccion.dto';

const direccionSelect = {
  id: true,
  direccion: true,
  calle: { select: { calle: true } },
  altura: true,
} satisfies Prisma.DireccionSelect;

type DireccionRecord = Prisma.DireccionGetPayload<{
  select: typeof direccionSelect;
}>;

function toResponse({ calle, ...direccion }: DireccionRecord) {
  return { ...direccion, calle: calle?.calle ?? null };
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
    return direcciones.map(toResponse);
  }

  async findOne(id: string) {
    const direccion = await this.prisma.direccion.findUnique({
      where: { id },
      select: direccionSelect,
    });
    if (!direccion) throw new NotFoundException('Direccion no encontrada');
    return toResponse(direccion);
  }

  async create(dto: CreateDireccionDto) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const data = await this.resolveData(tx, dto);
        return toResponse(
          await tx.direccion.create({ data, select: direccionSelect }),
        );
      });
    } catch (error) {
      this.rethrow(error);
    }
  }

  async resolveForPuntoLimpio(
    tx: Prisma.TransactionClient,
    dto: CreateDireccionDto,
  ) {
    const data = await this.resolveData(tx, dto);
    return tx.direccion.upsert({
      where: { calleId_altura: { calleId: data.calleId, altura: data.altura } },
      create: data,
      update: { altura: data.altura },
      select: { id: true },
    });
  }

  async update(id: string, dto: UpdateDireccionDto) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const actual = await tx.direccion.findUnique({
          where: { id, clienteId: null },
          select: direccionSelect,
        });
        if (!actual) throw new NotFoundException('Direccion no encontrada');
        if (dto.calle === undefined && dto.altura === undefined)
          return toResponse(actual);
        const calle = dto.calle ?? actual.calle?.calle;
        const altura = dto.altura ?? actual.altura;
        if (calle === undefined || altura === null)
          throw new BadRequestException(
            'Indica calle y altura para completar la direccion',
          );
        const data = await this.resolveData(tx, { calle, altura });
        return toResponse(
          await tx.direccion.update({
            where: { id, clienteId: null },
            data,
            select: direccionSelect,
          }),
        );
      });
    } catch (error) {
      this.rethrow(error);
    }
  }

  async remove(id: string) {
    try {
      await this.prisma.direccion.delete({ where: { id, clienteId: null } });
    } catch (error) {
      this.rethrow(error);
    }
  }

  private async resolveData(
    tx: Prisma.TransactionClient,
    dto: CreateDireccionDto,
  ) {
    const clave = dto.calle.toLocaleLowerCase('es-AR');
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
