import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { leerProgreso } from '../telemetria/progreso-trayecto';
import { referenciasRecorridoArgs } from '../punto-trayecto/puntos-trayecto.select';
import { esLineaValida } from '../trayecto/line-string';
import {
  calcularCobertura,
  distanciaAlPinMasCercano,
  type Recorrido,
} from '../trayecto/cobertura-trayecto';
import type {
  MapaHoyResponseDto,
  TrayectoHoyDto,
  TrayectosHoyResponseDto,
} from './hoy.dto';

@Injectable()
export class HoyService {
  constructor(private readonly prisma: PrismaService) {}

  private async obtenerFrente(usuarioId: string, direccionId: string) {
    const domicilio = await this.prisma.clienteDireccion.findFirst({
      where: { direccionId, cliente: { userId: usuarioId } },
      select: {
        direccion: {
          select: { calleId: true, altura: true, lat: true, long: true },
        },
      },
    });
    if (!domicilio) throw new NotFoundException('Domicilio no encontrado');
    return domicilio.direccion;
  }

  async consultarTrayectos(
    usuarioId: string,
    direccionId: string,
  ): Promise<TrayectosHoyResponseDto> {
    const frente = await this.obtenerFrente(usuarioId, direccionId);
    const { lat, long } = frente;
    const trayectos = await this.prisma.$transaction(
      (tx) =>
        tx.trayecto.findMany({
          select: {
            id: true,
            nombre: true,
            geometria: true,
            puntos: referenciasRecorridoArgs,
          },
        }),
      { isolationLevel: 'RepeatableRead' },
    );
    const confirmados = trayectos.flatMap(
      ({ id, nombre, geometria, puntos }) => {
        if (!esLineaValida(geometria)) return [];
        const recorrido = {
          geometria,
          referencias: puntos.map(({ orden, direccion }) => ({
            orden,
            ...direccion,
          })),
        };
        if (calcularCobertura(frente, recorrido).estado !== 'CUBIERTO')
          return [];
        return [
          {
            trayecto: { id, recorridoId: id, nombre, geometria },
            distancia: distanciaAlPinMasCercano(frente, recorrido),
          },
        ];
      },
    );
    confirmados.sort(
      (a, b) =>
        a.distancia - b.distancia || a.trayecto.id.localeCompare(b.trayecto.id),
    );
    return {
      domicilio: { lat, long },
      trayectos: confirmados.map(({ trayecto }) => trayecto),
    };
  }

  async consultarMapa(
    usuarioId: string,
    direccionId: string,
  ): Promise<MapaHoyResponseDto> {
    const frente = await this.obtenerFrente(usuarioId, direccionId);
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
