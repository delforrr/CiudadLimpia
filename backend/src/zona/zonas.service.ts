import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateZonaDto, UpdateZonaDto } from './zona.dto';

const campos = {
  id: true,
  nombre: true,
  descripcion: true,
  localidadId: true,
} as const;

function claveZona(nombre: string) {
  return nombre
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('es')
    .replace(/\s+/g, ' ');
}

@Injectable()
export class ZonasService {
  constructor(private readonly prisma: PrismaService) {}

  listar() {
    return this.prisma.zona.findMany({
      orderBy: [{ nombre: 'asc' }, { id: 'asc' }],
      select: campos,
    });
  }

  async crear(datos: CreateZonaDto) {
    const localidad = await this.prisma.localidad.findUnique({
      where: { id: datos.localidadId },
      select: { id: true },
    });
    if (!localidad)
      throw new BadRequestException('La localidad indicada no existe');
    return this.prisma.zona.create({
      data: { ...datos, clave: claveZona(datos.nombre) },
      select: campos,
    });
  }

  editar(id: string, datos: UpdateZonaDto) {
    return this.prisma.zona.update({
      where: { id },
      data: {
        ...datos,
        clave: datos.nombre === undefined ? undefined : claveZona(datos.nombre),
      },
      select: campos,
    });
  }

  async eliminar(id: string) {
    try {
      await this.prisma.zona.delete({ where: { id } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ConflictException(
          'Reasigná los trayectos de esta zona antes de eliminarla.',
        );
      }
      throw error;
    }
  }
}
