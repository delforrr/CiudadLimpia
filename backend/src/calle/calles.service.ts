import { Injectable, NotFoundException } from '@nestjs/common';
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
    return this.prisma.calle.create({
      data: { calle, clave: claveCalle(calle) },
      select,
    });
  }

  async update(id: string, calle: string) {
    return this.prisma.calle.update({
      where: { id },
      data: { calle, clave: claveCalle(calle) },
      select,
    });
  }

  async remove(id: string) {
    await this.prisma.calle.delete({ where: { id } });
  }
}
