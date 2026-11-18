import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { camionSelect, type CamionRecord } from './camiones.select';
import { CreateCamionDto } from './dto/create-camion.dto';

@Injectable()
export class CamionesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(body: CreateCamionDto): Promise<CamionRecord> {
    try {
      return await this.prisma.camion.create({
        data: body,
        select: camionSelect,
      });
    } catch (error: unknown) {
      this.rethrow(error);
    }
  }

  private rethrow(error: unknown): never {
    if (
      (error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002') ||
      (typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'P2002')
    ) {
      throw new ConflictException('Ya existe un camión con esa patente');
    }
    throw error;
  }
}
