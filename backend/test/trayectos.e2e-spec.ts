import type { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Trayectos (HTTP)', () => {
  let app: INestApplication<App>;
  let admin: string;
  let usuario: string;
  const localidad = { id: '06826050', nombre: 'Trenque Lauquen' };
  const prisma = {
    user: {
      findUnique: ({ where }: { where: { id: string } }) => ({
        id: where.id,
        role: where.id === 'admin' ? 'ADMIN' : 'USER',
      }),
    },
    localidad: { findMany: jest.fn().mockResolvedValue([localidad]) },
  };

  beforeAll(async () => {
    process.env.JWT_SECRET = 'test-only-secret-at-least-32-characters';
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();
    app = module.createNestApplication();
    configureApp(app);
    await app.init();
    const jwt = app.get(JwtService);
    admin = `Bearer ${await jwt.signAsync({ sub: 'admin' })}`;
    usuario = `Bearer ${await jwt.signAsync({ sub: 'usuario' })}`;
  });

  afterAll(async () => {
    await app.close();
  });

  it('permite consultar el catálogo persistido a ADMIN', async () => {
    const api = () => request(app.getHttpServer()).get('/api/localidades');
    await api().expect(401);
    await api().set('Authorization', usuario).expect(403);
    await api().set('Authorization', admin).expect(200).expect([localidad]);
  });

  const escrituras = [
    ['post', '/api/trayectos'],
    ['patch', '/api/trayectos/d6b3ff34-15fc-4a47-b299-8d16a321218d'],
  ] as const;
  it.each(escrituras)('%s valida permisos y datos', async (metodo, ruta) => {
    const api = () => request(app.getHttpServer())[metodo](ruta);
    const puntos = [
      { orden: 0, lat: -35.97, long: -62.73 },
      { orden: 1, lat: -35.98, long: -62.74 },
    ];
    const geometria = {
      type: 'LineString',
      coordinates: [
        [-62.73, -35.97],
        [-62.74, -35.98],
      ],
    };
    const entrada = {
      nombre: 'Centro',
      localidadId: localidad.id,
      puntos,
      geometria,
    };

    await api().send(entrada).expect(401);
    await api().set('Authorization', usuario).send(entrada).expect(403);
    await api().set('Authorization', admin).expect(415);

    for (const invalido of [
      { geometria: undefined },
      { nombre: '  ' },
      { localidadId: null },
      { puntos: [puntos[0], { ...puntos[1], orden: 2 }] },
      { puntos: [puntos[0], { ...puntos[1], lat: 95 }] },
      { puntos: [puntos[0], { ...puntos[1], long: '1' }] },
      { puntos: [puntos[0], { ...puntos[1], orden: 0 }] },
      { puntos: [puntos[0], { ...puntos[1], direccion: null }] },
      {
        puntos: [
          puntos[0],
          {
            ...puntos[1],
            direccionId: 'd6b3ff34-15fc-4a47-b299-8d16a321218d',
            direccion: { calle: 'Roca' },
          },
        ],
      },
      {
        geometria: {
          ...geometria,
          coordinates: [
            [1, 2],
            [1, 2],
          ],
        },
      },
      {
        geometria: {
          ...geometria,
          coordinates: [
            [1, 2],
            [2, 91],
          ],
        },
      },
      {
        geometria: {
          ...geometria,
          coordinates: [
            [1, 2],
            [2, 3, 4],
          ],
        },
      },
      { geometria: { ...geometria, type: 'MultiLineString' } },
      { geometria: null },
    ]) {
      await api()
        .set('Authorization', admin)
        .send({ ...entrada, ...invalido })
        .expect(400);
    }
  });
});
