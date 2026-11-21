import { Injectable, NotFoundException } from '@nestjs/common';
import { Estado } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { camionSelect, type CamionRecord } from './camiones.select';
import { CreateCamionDto } from './dto/create-camion.dto';
import { UpdateCamionDto } from './dto/update-camion.dto';

@Injectable()
export class CamionesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<CamionRecord[]> {
    return this.prisma.camion.findMany({
      select: camionSelect,
      orderBy: { patente: 'asc' },
    });
  }

  async findOne(id: string): Promise<CamionRecord> {
    const camion = await this.prisma.camion.findUnique({
      where: { id },
      select: camionSelect,
    });
    if (!camion) throw new NotFoundException('Camion no encontrado');
    return camion;
  }

  async create(body: CreateCamionDto): Promise<CamionRecord> {
    return this.prisma.camion.create({
      data: body,
      select: camionSelect,
    });
  }

  async update(id: string, body: UpdateCamionDto): Promise<CamionRecord> {
    return this.prisma.camion.update({
      where: { id },
      data: body,
      select: camionSelect,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.camion.update({
      where: { id },
      data: { estado: Estado.INACTIVO },
    });
  }
}
