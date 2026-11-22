import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { leerProgreso } from '../telemetria/progreso-trayecto';
import {
  calcularCobertura,
  distanciaAlPinMasCercano,
  type Recorrido,
} from '../trayecto/cobertura-trayecto';
import type { MapaHoyResponseDto, TrayectoHoyDto } from './hoy.dto';

@Injectable()
export class HoyService {
  constructor(private readonly prisma: PrismaService) {}

  async consultarMapa(
    usuarioId: string,
    direccionId: string,
  ): Promise<MapaHoyResponseDto> {
    const domicilio = await this.prisma.clienteDireccion.findFirst({
      where: { direccionId, cliente: { userId: usuarioId } },
      select: {
        direccion: {
          select: { calleId: true, altura: true, lat: true, long: true },
        },
      },
    });
    if (!domicilio) throw new NotFoundException('Domicilio no encontrado');

    const frente = domicilio.direccion;
    const { lat, long } = frente;
    const servicios = await this.prisma.servicioRecoleccion.findMany({
      where: { visibleHasta: { gt: new Date() }, camion: { estado: 'ACTIVO' } },
      include: { camion: { select: { marca: true, modelo: true } } },
    });
    const ordenados = servicios
      .map((servicio) => {
        const recorrido = servicio.recorrido as unknown as Recorrido;
        return {
          servicio,
          recorrido,
          distancia: distanciaAlPinMasCercano(frente, recorrido),
        };
      })
      .sort(
        (a, b) =>
          a.distancia - b.distancia ||
          a.servicio.trayectoId.localeCompare(b.servicio.trayectoId),
      );

    const trayectos = new Map<string, TrayectoHoyDto>();
    const resultado: MapaHoyResponseDto = {
      domicilio: { lat, long },
      trayectos: [],
      camiones: [],
    };
    for (const { servicio, recorrido } of ordenados) {
      const { id, camionId, trayectoId, recorridoId, nombre, camion } =
        servicio;
      const progreso = leerProgreso(servicio.progreso);
      if (!progreso) continue;
      if (!trayectos.has(recorridoId)) {
        if (calcularCobertura(frente, recorrido).estado !== 'CUBIERTO')
          continue;
        trayectos.set(recorridoId, {
          id: trayectoId,
          recorridoId,
          nombre,
          geometria: recorrido.geometria,
        });
      }
      resultado.camiones.push({
        servicioId: id,
        camionId,
        trayectoId,
        recorridoId,
        nombre: `${camion.marca} ${camion.modelo}`,
        posicion: progreso.posicion,
        registradoEn: progreso.registradoEn.toISOString(),
      });
    }
    resultado.trayectos = [...trayectos.values()];
    return resultado;
  }
}
