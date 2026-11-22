import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  EnvioPushService,
  TransportePush,
} from '../src/push/envio-push.service';
import type { PosicionTelemetriaDto } from '../src/telemetria/telemetria.dto';
import type { LineStringDto } from '../src/trayecto/trayecto.dto';

export const describePostgres = process.env.TEST_DATABASE_URL
  ? describe
  : describe.skip;

export function posicion(x: number, y = 0) {
  return {
    long: -62.73 + x / (111195.0802335 * Math.cos(Math.PI / 5)),
    lat: -36 + y / 111195.0802335,
  };
}

export function geometria(vertices: [number, number][]): LineStringDto {
  return {
    type: 'LineString',
    coordinates: vertices.map(([x, y]) => {
      const { long, lat } = posicion(x, y);
      return [long, lat];
    }),
  };
}

export async function prepararRecoleccion(push = false) {
  const enviar = jest
    .fn<Promise<number>, Parameters<TransportePush['enviar']>>()
    .mockResolvedValue(201);
  const config = new ConfigService({
    DATABASE_URL: process.env.TEST_DATABASE_URL,
    JWT_SECRET: 'test-only-secret-at-least-32-characters',
    TELEMETRIA_PROVEEDOR_ID: 'mock',
    TELEMETRIA_TOKEN: 'gps-test-token',
    PUSH_HABILITADO: push ? '1' : '0',
    PUSH_VAPID_PUBLICA: 'vapid-publica-de-prueba',
  });
  const modulo = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(ConfigService)
    .useValue(config)
    .overrideProvider(TransportePush)
    .useValue({ enviar })
    .compile();
  const app: INestApplication<App> = modulo.createNestApplication();
  configureApp(app);
  const despachador = app.get(EnvioPushService);
  jest.spyOn(despachador, 'onModuleInit').mockImplementation(() => undefined);
  await app.init();
  const prisma = app.get(PrismaService);
  const prefijo = randomUUID();
  const localidadId = '06826050';
  const calle = await prisma.calle.create({
    data: { calle: `Roca ${prefijo}`, clave: `roca-${prefijo}` },
  });
  const otraCalle = await prisma.calle.create({
    data: { calle: `Pincén ${prefijo}`, clave: `pincen-${prefijo}` },
  });
  const domicilios = await Promise.all(
    [600, 700].map((x, i) =>
      prisma.direccion.create({
        data: { calleId: calle.id, altura: 850 + i, ...posicion(x, 5) },
      }),
    ),
  );
  const usuarios = await Promise.all(
    ['vecino', 'otro', 'admin'].map((nombre) =>
      prisma.user.create({
        data: {
          email: `${nombre}-${prefijo}@example.test`,
          role: nombre === 'admin' ? 'ADMIN' : 'USER',
          passwordHash: 'sin-uso',
          ...(nombre === 'vecino' && {
            cliente: {
              create: {
                name: 'Ana',
                lastName: 'Pérez',
                domicilios: {
                  create: domicilios.map(({ id }) => ({ direccionId: id })),
                },
              },
            },
          }),
        },
      }),
    ),
  );
  const [vecino, otro, admin] = await Promise.all(
    usuarios.map(
      async ({ id }) =>
        `Bearer ${await app.get(JwtService).signAsync({ sub: id })}`,
    ),
  );
  const camiones = await Promise.all(
    [0, 1, 2].map((i) =>
      prisma.camion.create({
        data: {
          marca: 'Camión',
          modelo: String(i),
          anio: 2023,
          patente: `${prefijo}-${i}`,
        },
      }),
    ),
  );

  async function crearTrayecto(
    nombre: string,
    vertices: [number, number][],
    calleId = calle.id,
  ) {
    const referencia = await Promise.all(
      vertices.map(async ([x, y], orden) => {
        const direccion = await prisma.direccion.create({
          data: {
            calleId,
            altura: 100 + orden,
            ...posicion(x, y),
          },
        });
        return { orden, direccionId: direccion.id };
      }),
    );
    return prisma.trayecto.create({
      data: {
        nombre: `${prefijo} ${nombre}`,
        localidadId,
        geometria: { ...geometria(vertices) },
        puntos: { create: referencia },
      },
    });
  }

  const trayecto = await crearTrayecto('Roca', [
    [0, 0],
    [1000, 0],
  ]);
  const transversal = await crearTrayecto(
    'Pincén',
    [
      [600, -100],
      [600, 100],
    ],
    otraCalle.id,
  );
  const api = () => request(app.getHttpServer());
  const muestra = (
    x: number,
    opciones: Partial<PosicionTelemetriaDto> = {},
  ): PosicionTelemetriaDto => ({
    servicioId: randomUUID(),
    camionId: camiones[0].id,
    trayectoId: trayecto.id,
    ...posicion(x),
    precisionM: 5,
    registradoEn: new Date().toISOString(),
    ...opciones,
  });
  const gps = (dto: PosicionTelemetriaDto, token = 'gps-test-token') =>
    api()
      .post('/api/telemetria/posiciones')
      .set('Authorization', `Bearer ${token}`)
      .send(dto);
  const mapa = (id = domicilios[0].id, token = vecino) =>
    api().get(`/api/hoy/domicilios/${id}/mapa`).set('Authorization', token);

  return {
    app,
    prisma,
    camiones,
    trayecto,
    transversal,
    domicilios,
    vecino,
    vecinoId: usuarios[0].id,
    otro,
    admin,
    api,
    muestra,
    gps,
    mapa,
    despachador,
    enviar,
    async cerrar() {
      try {
        await prisma.user.deleteMany({
          where: { id: { in: usuarios.map(({ id }) => id) } },
        });
        await prisma.trayecto.deleteMany({
          where: { nombre: { startsWith: prefijo } },
        });
        await prisma.direccion.deleteMany({
          where: { calleId: { in: [calle.id, otraCalle.id] } },
        });
        await prisma.calle.deleteMany({
          where: { id: { in: [calle.id, otraCalle.id] } },
        });
        await prisma.camion.deleteMany({
          where: { id: { in: camiones.map(({ id }) => id) } },
        });
      } finally {
        await app.close();
      }
    },
  };
}
