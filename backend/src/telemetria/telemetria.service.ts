import { createHash } from 'node:crypto';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from '../push/push.service';
import {
  tramosRecorridoArgs,
  type Recorrido,
} from '../trayecto/cobertura-trayecto';
import { esLineaValida } from '../trayecto/line-string';
import { leerProgreso, proyectarProgreso } from './progreso-trayecto';
import type { PosicionTelemetriaDto } from './telemetria.dto';

export interface ReceptorTelemetria {
  registrarPosicion(
    proveedorId: string,
    dto: PosicionTelemetriaDto,
  ): Promise<void>;
}

@Injectable()
export class TelemetriaService implements ReceptorTelemetria {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly push: PushService,
  ) {}

  async consultarAvisos(proveedorId: string, servicioId: string) {
    const habilitado = this.config.get('PUSH_HABILITADO') === '1';
    const estados = await this.prisma.entregaPush.groupBy({
      by: ['estado'],
      where: { prestacion: { proveedorId, servicioId } },
      _count: { _all: true },
    });
    const cantidades = new Map(
      estados.map(({ estado, _count }) => [estado, _count._all]),
    );
    return {
      habilitado,
      pendientes: cantidades.get('PENDIENTE') ?? 0,
      enviados: cantidades.get('ENVIADO') ?? 0,
      cancelados: cantidades.get('CANCELADO') ?? 0,
    };
  }

  async registrarPosicion(
    proveedorId: string,
    dto: PosicionTelemetriaDto,
  ): Promise<void> {
    const { servicioId, camionId, trayectoId } = dto;
    const muestraEn = new Date(dto.registradoEn);
    const edad = Date.now() - muestraEn.getTime();
    if (
      !Number.isFinite(edad) ||
      edad > 30_000 ||
      edad < -5_000 ||
      dto.precisionM > 30
    )
      return;

    await this.prisma.$transaction(async (tx) => {
      const clave = { proveedorId, servicioId };
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`${proveedorId}:${servicioId}`}, 0))::text`;
      const existente = await tx.servicioRecoleccion.findUnique({
        where: { proveedorId_servicioId: clave },
      });
      if (
        existente &&
        (existente.camionId !== camionId || existente.trayectoId !== trayectoId)
      ) {
        throw new ConflictException(
          'La prestación ya está vinculada a otro camión o trayecto',
        );
      }
      if (existente && existente.muestraEn >= muestraEn) return;
      const camion = await tx.camion.findUnique({
        where: { id: camionId },
        select: { estado: true },
      });
      if (camion?.estado !== 'ACTIVO')
        throw new NotFoundException('Camión activo no encontrado');

      let servicio = existente;
      if (!servicio) {
        await tx.$queryRaw`SELECT id FROM "Trayecto" WHERE id = ${trayectoId} FOR SHARE`;
        const trayecto = await tx.trayecto.findUnique({
          where: { id: trayectoId },
          include: {
            tramos: tramosRecorridoArgs,
          },
        });
        if (!trayecto) throw new NotFoundException('Trayecto no encontrado');
        if (!esLineaValida(trayecto.geometria))
          throw new ConflictException('El trayecto carece de una línea válida');
        const recorrido: Recorrido = {
          geometria: trayecto.geometria,
          tramos: trayecto.tramos.map(
            ({ calleId, desde, hasta, lado, calle }) => ({
              calleId: calle.calleVigenteId ?? calleId,
              desde,
              hasta,
              lado,
            }),
          ),
        };
        const recorridoId = createHash('sha256')
          .update(
            JSON.stringify({
              trayectoId,
              nombre: trayecto.nombre,
              ...recorrido,
            }),
          )
          .digest('hex');
        servicio = await tx.servicioRecoleccion.create({
          data: {
            ...clave,
            camionId,
            trayectoId,
            nombre: trayecto.nombre,
            recorridoId,
            muestraEn,
            recorrido: {
              geometria: { ...recorrido.geometria },
              tramos: recorrido.tramos.map(
                ({ calleId, desde, hasta, lado }) => ({
                  calleId,
                  desde,
                  hasta,
                  lado,
                }),
              ),
            },
          },
        });
      }

      const { geometria } = servicio.recorrido as unknown as Recorrido;
      const progreso = proyectarProgreso(
        dto,
        geometria,
        leerProgreso(servicio.progreso),
      );
      await tx.servicioRecoleccion.update({
        where: { id: servicio.id },
        data: {
          muestraEn,
          visibleHasta: progreso
            ? new Date(Math.min(muestraEn.getTime(), Date.now()) + 30_000)
            : null,
          ...(progreso && {
            progreso: {
              ...progreso,
              registradoEn: progreso.registradoEn.toISOString(),
            },
          }),
        },
      });
      if (progreso?.avanza && this.config.get('PUSH_HABILITADO') === '1') {
        await this.push.encolarAvisos(tx, servicio.id, progreso);
      }
    });
  }
}
