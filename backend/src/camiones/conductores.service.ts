import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateConductorDto, UpdateConductorDto } from './dto/conductor.dto';

@Injectable()
export class ConductoresService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.conductor.findMany({
      orderBy: [{ apellido: 'asc' }, { nombre: 'asc' }, { id: 'asc' }],
    });
  }

  async findOne(id: string) {
    const conductor = await this.prisma.conductor.findUnique({ where: { id } });
    if (!conductor) throw new NotFoundException('Conductor no encontrado');
    return conductor;
  }

  create(body: CreateConductorDto) {
    return this.prisma.conductor.create({ data: body });
  }

  update(id: string, body: UpdateConductorDto) {
    return this.prisma.conductor.update({ where: { id }, data: body });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.conductor.update({
      where: { id },
      data: { activo: false },
    });
  }
}
