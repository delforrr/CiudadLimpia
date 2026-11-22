import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { generateRequestDetails } from 'web-push';
import { PrismaService } from '../prisma/prisma.service';
import { leerProgreso } from '../telemetria/progreso-trayecto';
import {
  calcularCobertura,
  type Recorrido,
} from '../trayecto/cobertura-trayecto';
import { debeAvisar, validarEndpointPush } from './push.service';

@Injectable()
export class TransportePush {
  constructor(private readonly config: ConfigService) {}

  async enviar(
    suscripcion: { endpoint: string; p256dh: string; auth: string },
    id: string,
    ttl: number,
  ): Promise<number> {
    const endpoint = validarEndpointPush(suscripcion.endpoint);
    const detalles = generateRequestDetails(
      {
        endpoint: endpoint.href,
        keys: {
          p256dh: suscripcion.p256dh,
          auth: suscripcion.auth,
        },
      },
      JSON.stringify({
        id,
        titulo: 'Recolección cerca de tu domicilio',
        url: '/hoy',
      }),
      {
        TTL: ttl,
        topic: id.replaceAll('-', '').slice(0, 32),
        vapidDetails: {
          subject: this.config.getOrThrow<string>('PUSH_VAPID_CONTACTO'),
          publicKey: this.config.getOrThrow<string>('PUSH_VAPID_PUBLICA'),
          privateKey: this.config.getOrThrow<string>('PUSH_VAPID_PRIVADA'),
        },
      },
    );
    const respuesta = await fetch(endpoint, {
      method: detalles.method,
      headers: Object.fromEntries(
        Object.entries(detalles.headers).map(([k, v]) => [k, String(v)]),
      ),
      body: detalles.body ? new Uint8Array(detalles.body) : undefined,
      redirect: 'error',
      signal: AbortSignal.timeout(5000),
    });
    await respuesta.body?.cancel();
    return respuesta.status;
  }
}

@Injectable()
export class EnvioPushService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EnvioPushService.name);
  private timer?: NodeJS.Timeout;
  private ocupado = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly transporte: TransportePush,
  ) {}

  onModuleInit() {
    if (this.config.get('PUSH_HABILITADO') !== '1') return;
    this.timer = setInterval(() => {
      if (this.ocupado) return;
      this.ocupado = true;
      void this.despacharPendientes(new Date())
        .catch(() =>
          this.logger.error('Falló el procesamiento de entregas push'),
        )
        .finally(() => {
          this.ocupado = false;
        });
    }, 2000);
    this.timer.unref();
  }

  onModuleDestroy() {
    clearInterval(this.timer);
  }

  async despacharPendientes(ahora: Date): Promise<void> {
    await this.prisma.entregaPush.updateMany({
      where: {
        estado: 'PENDIENTE',
        venceEn: { lte: ahora },
        proximoIntentoEn: { lte: ahora },
      },
      data: { estado: 'CANCELADO' },
    });
    const pendientes = await this.prisma.entregaPush.findMany({
      where: {
        estado: 'PENDIENTE',
        venceEn: { gt: ahora },
        proximoIntentoEn: { lte: ahora },
      },
      orderBy: { proximoIntentoEn: 'asc' },
      take: 20,
      select: { id: true, intentos: true },
    });
    await Promise.all(
      pendientes.map(({ id, intentos }) => this.despachar(id, intentos)),
    );
  }

  private async despachar(id: string, intentos: number) {
    const ahora = new Date();
    const { count } = await this.prisma.entregaPush.updateMany({
      where: {
        id,
        estado: 'PENDIENTE',
        intentos,
        venceEn: { gt: ahora },
        proximoIntentoEn: { lte: ahora },
      },
      data: {
        intentos: { increment: 1 },
        proximoIntentoEn: new Date(ahora.getTime() + 15_000),
      },
    });
    if (!count) return;
    const where = { id, estado: 'PENDIENTE' as const, intentos: intentos + 1 };
    const entrega = await this.prisma.entregaPush.findFirst({
      where,
      include: {
        suscripcion: {
          include: { domicilio: { include: { direccion: true } } },
        },
        prestacion: { include: { camion: { select: { estado: true } } } },
      },
    });
    if (!entrega) return;
    const { suscripcion, prestacion } = entrega;
    const progreso = leerProgreso(prestacion.progreso);
    const cobertura = calcularCobertura(
      suscripcion.domicilio.direccion,
      prestacion.recorrido as unknown as Recorrido,
    );
    const restante = entrega.venceEn.getTime() - Date.now();
    if (
      restante <= 0 ||
      suscripcion.version !== entrega.versionSuscripcion ||
      prestacion.camion.estado !== 'ACTIVO' ||
      cobertura.estado !== 'CUBIERTO'
    ) {
      await this.prisma.entregaPush.updateMany({
        where,
        data: { estado: 'CANCELADO' },
      });
      return;
    }
    if (
      !prestacion.visibleHasta ||
      prestacion.visibleHasta.getTime() <= Date.now() ||
      !progreso ||
      !debeAvisar(cobertura.pasosEnTrayectoM, progreso)
    ) {
      await this.prisma.entregaPush.updateMany({
        where,
        data: { proximoIntentoEn: new Date(Date.now() + 2000) },
      });
      return;
    }

    const vigente = await this.prisma.entregaPush.updateMany({
      where,
      data: { intentoEnvio: true },
    });
    if (!vigente.count) return;
    const codigo = await this.transporte
      .enviar(suscripcion, id, Math.floor(restante / 1000))
      .catch(() => 503);
    if (codigo === 404 || codigo === 410) {
      await this.prisma.suscripcionPush.deleteMany({
        where: { id: suscripcion.id, version: suscripcion.version },
      });
    } else if (codigo >= 200 && codigo < 300) {
      await this.prisma.entregaPush.updateMany({
        where,
        data: { estado: 'ENVIADO' },
      });
    } else if (codigo !== 429 && codigo < 500) {
      await this.prisma.entregaPush.updateMany({
        where,
        data: { estado: 'CANCELADO' },
      });
    } else {
      await this.prisma.entregaPush.updateMany({
        where,
        data: { proximoIntentoEn: new Date(Date.now() + 5000) },
      });
    }
  }
}
