import { ECDH } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { ProgresoTrayecto } from '../telemetria/progreso-trayecto';
import {
  calcularCobertura,
  type Recorrido,
} from '../trayecto/cobertura-trayecto';
import type {
  GuardarSuscripcionPushDto,
  SuscripcionPushResponseDto,
} from './push.dto';

const resumen = { id: true, direccionId: true } as const;

export function validarEndpointPush(endpoint: string): URL {
  const url = URL.parse(endpoint);
  if (
    !url ||
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.port ||
    url.hash
  ) {
    throw new BadRequestException('Endpoint push inválido');
  }
  const rutaPermitida =
    (url.hostname === 'fcm.googleapis.com' &&
      /^\/(?:fcm\/send|wp)\/[^/]+$/.test(url.pathname)) ||
    (url.hostname === 'updates.push.services.mozilla.com' &&
      /^\/wpush\/v[12]\/[^/]+$/.test(url.pathname)) ||
    (url.hostname === 'web.push.apple.com' && /^\/[^/]+$/.test(url.pathname)) ||
    (/^[a-z0-9-]+\.notify\.windows\.com$/.test(url.hostname) &&
      url.pathname === '/w/');
  if (!rutaPermitida || url.href.length > 2000)
    throw new BadRequestException('Proveedor push no permitido');
  return url;
}

export function debeAvisar(
  pasosEnTrayectoM: readonly number[],
  progreso: ProgresoTrayecto,
): boolean {
  const proximo = pasosEnTrayectoM.find((paso) => paso > progreso.metros);
  return (
    progreso.avanza && proximo !== undefined && proximo - progreso.metros <= 300
  );
}

@Injectable()
export class PushService {
  constructor(private readonly prisma: PrismaService) {}

  async guardarSuscripcion(
    usuarioId: string,
    dto: GuardarSuscripcionPushDto,
  ): Promise<SuscripcionPushResponseDto> {
    const endpoint = validarEndpointPush(dto.endpoint).href;
    const { direccionId, keys } = dto;
    try {
      const llave = Buffer.from(keys.p256dh, 'base64url');
      if (
        llave[0] !== 4 ||
        llave.toString('base64url') !== keys.p256dh ||
        Buffer.from(keys.auth, 'base64url').toString('base64url') !== keys.auth
      )
        throw new Error();
      ECDH.convertKey(llave, 'prime256v1');
    } catch {
      throw new BadRequestException('Claves push inválidas');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${endpoint}, 0))::text`;
      const domicilio = await tx.clienteDireccion.findFirst({
        where: { direccionId, cliente: { userId: usuarioId } },
        select: { clienteId: true },
      });
      if (!domicilio) throw new NotFoundException('Domicilio no encontrado');
      const actual = await tx.suscripcionPush.findUnique({
        where: { endpoint },
      });
      const data = { ...domicilio, direccionId, endpoint, ...keys };
      if (!actual) return tx.suscripcionPush.create({ data, select: resumen });
      const mismaLlave =
        actual.p256dh === keys.p256dh && actual.auth === keys.auth;
      if (actual.clienteId !== domicilio.clienteId && !mismaLlave) {
        throw new ConflictException('El endpoint ya está registrado');
      }
      if (
        actual.clienteId === domicilio.clienteId &&
        actual.direccionId === direccionId &&
        mismaLlave
      ) {
        return { id: actual.id, direccionId };
      }
      const guardada = await tx.suscripcionPush.update({
        where: { id: actual.id },
        data: { ...data, version: { increment: 1 } },
        select: resumen,
      });
      await tx.entregaPush.updateMany({
        where: { suscripcionId: actual.id, estado: 'PENDIENTE' },
        data: { estado: 'CANCELADO' },
      });
      return guardada;
    });
  }

  async consultarSuscripcion(
    usuarioId: string,
    id: string,
  ): Promise<SuscripcionPushResponseDto> {
    const suscripcion = await this.prisma.suscripcionPush.findFirst({
      where: { id, domicilio: { cliente: { userId: usuarioId } } },
      select: resumen,
    });
    if (!suscripcion) throw new NotFoundException('Suscripción no encontrada');
    return suscripcion;
  }

  async eliminarSuscripcion(usuarioId: string, id: string): Promise<void> {
    const { count } = await this.prisma.suscripcionPush.deleteMany({
      where: { id, domicilio: { cliente: { userId: usuarioId } } },
    });
    if (!count) throw new NotFoundException('Suscripción no encontrada');
  }

  async encolarAvisos(
    tx: Prisma.TransactionClient,
    prestacionId: string,
    progreso: ProgresoTrayecto,
  ): Promise<void> {
    if (!progreso.avanza) return;
    const prestacion = await tx.servicioRecoleccion.findUniqueOrThrow({
      where: { id: prestacionId },
      select: { recorrido: true },
    });
    const recorrido = prestacion.recorrido as unknown as Recorrido;
    const suscripciones = await tx.suscripcionPush.findMany({
      where: {
        entregas: {
          none: {
            prestacionId,
            OR: [{ estado: { not: 'CANCELADO' } }, { intentoEnvio: true }],
          },
        },
      },
      select: {
        id: true,
        version: true,
        direccionId: true,
        entregas: {
          where: { prestacionId },
          select: { id: true, versionSuscripcion: true },
        },
        domicilio: {
          select: {
            direccion: {
              select: { calleId: true, altura: true, lat: true, long: true },
            },
          },
        },
      },
    });
    const porFrente = new Map<string, boolean>();
    const venceEn = new Date(
      Math.min(Date.now(), progreso.registradoEn.getTime()) + 60_000,
    );
    const data = suscripciones.flatMap((suscripcion) => {
      const { id, version, direccionId, domicilio, entregas } = suscripcion;
      const previa = entregas[0];
      if (previa?.versionSuscripcion === version) return [];
      if (!porFrente.has(direccionId)) {
        const cobertura = calcularCobertura(domicilio.direccion, recorrido);
        porFrente.set(
          direccionId,
          cobertura.estado === 'CUBIERTO' &&
            debeAvisar(cobertura.pasosEnTrayectoM, progreso),
        );
      }
      return porFrente.get(direccionId)
        ? [
            {
              previa,
              datos: {
                prestacionId,
                suscripcionId: id,
                versionSuscripcion: version,
                venceEn,
              },
            },
          ]
        : [];
    });
    if (!data.length) return;
    const vigentes = await tx.$queryRaw<{ id: string; version: number }[]>`
      SELECT id, version FROM "SuscripcionPush"
      WHERE id IN (${Prisma.join(data.map(({ datos }) => datos.suscripcionId))})
      ORDER BY id FOR SHARE
    `;
    const versiones = new Map(vigentes.map(({ id, version }) => [id, version]));
    const nuevas: (typeof data)[number]['datos'][] = [];
    for (const { previa, datos } of data) {
      if (versiones.get(datos.suscripcionId) !== datos.versionSuscripcion)
        continue;
      if (previa) {
        await tx.entregaPush.updateMany({
          where: { id: previa.id, estado: 'CANCELADO', intentoEnvio: false },
          data: {
            estado: 'PENDIENTE',
            intentos: 0,
            venceEn,
            versionSuscripcion: datos.versionSuscripcion,
            proximoIntentoEn: new Date(),
          },
        });
      } else nuevas.push(datos);
    }
    if (nuevas.length)
      await tx.entregaPush.createMany({ data: nuevas, skipDuplicates: true });
  }
}
