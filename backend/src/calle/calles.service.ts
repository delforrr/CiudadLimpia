import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { claveCalle } from './calle.dto';

const select = { id: true, calle: true } as const;

@Injectable()
export class CallesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(buscar?: string) {
    const texto = typeof buscar === 'string' ? buscar.trim() : '';
    return this.prisma.calle.findMany({
      where: texto ? { calle: { contains: texto, mode: 'insensitive' } } : {},
      orderBy: [{ calle: 'asc' }, { id: 'asc' }],
      take: 20,
      select,
    });
  }

  async findOne(id: string) {
    const calle = await this.prisma.calle.findUnique({ where: { id }, select });
    if (!calle) throw new NotFoundException('Calle no encontrada');
    return calle;
  }

  async create(calle: string) {
    try {
      return await this.prisma.calle.create({
        data: { calle, clave: claveCalle(calle) },
        select,
      });
    } catch (error: unknown) {
      this.rethrow(error);
    }
  }

  async update(id: string, calle: string) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const actualizada = await tx.calle.update({
          where: { id },
          data: { calle, clave: claveCalle(calle) },
          select,
        });
        // El texto también se usa para buscar direcciones y leer domicilios históricos.
        await tx.$executeRaw`
          UPDATE "Direccion"
          SET "direccion" = ${calle} || ' ' || "altura"
          WHERE "calleId" = ${id} AND "altura" IS NOT NULL
        `;
        return actualizada;
      });
    } catch (error: unknown) {
      this.rethrow(error);
    }
  }

  async remove(id: string) {
    try {
      await this.prisma.calle.delete({ where: { id } });
    } catch (error: unknown) {
      this.rethrow(error);
    }
  }

  private rethrow(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002')
        throw new ConflictException('La calle ya existe');
      if (error.code === 'P2003')
        throw new ConflictException('La calle está en uso');
      if (error.code === 'P2025')
        throw new NotFoundException('Calle no encontrada');
    }
    throw error;
  }
}
