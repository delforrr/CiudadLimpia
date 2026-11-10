import type { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Sugerencia de trayecto (HTTP)', () => {
  let app: INestApplication<App>;
  let admin: string;
  let usuario: string;
  const fetchMock = jest.spyOn(globalThis, 'fetch');
  const baseUrl = 'https://rutas.example.test/routed-car/';
  const puntos = [
    { lat: -35.977206, long: -62.732025 },
    { lat: -35.977325, long: -62.730147 },
    { lat: -35.975939, long: -62.729491 },
  ];

  beforeAll(async () => {
    process.env.JWT_SECRET = 'test-only-secret-at-least-32-characters';
    process.env.OSRM_BASE_URL = baseUrl;
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue({
        user: {
          findUnique: ({ where }: { where: { id: string } }) => ({
            id: where.id,
            role: where.id === 'admin' ? 'ADMIN' : 'USER',
          }),
        },
      })
      .compile();
    app = module.createNestApplication();
    configureApp(app);
    await app.init();
    const jwt = app.get(JwtService);
    admin = `Bearer ${await jwt.signAsync({ sub: 'admin' })}`;
    usuario = `Bearer ${await jwt.signAsync({ sub: 'usuario' })}`;
  });

  beforeEach(() => {
    fetchMock.mockReset();
  });

  afterAll(async () => {
    fetchMock.mockRestore();
    delete process.env.OSRM_BASE_URL;
    await app.close();
  });

  function api() {
    return request(app.getHttpServer()).post('/api/trayectos/sugerencia');
  }

  function comoAdmin() {
    return api().set('Authorization', admin).send({ puntos });
  }

  it('respeta el orden y devuelve la línea vial completa sin escribir el trayecto', async () => {
    const geometria = {
      type: 'LineString',
      coordinates: [
        [-62.732025, -35.977206],
        [-62.731734, -35.977888],
        [-62.730147, -35.977325],
        [-62.729491, -35.975939],
      ],
    };
    fetchMock.mockResolvedValueOnce(
      Response.json({
        code: 'Ok',
        routes: [{ geometry: { ...geometria, bbox: [-63, -36, -62, -35] } }],
      }),
    );

    await comoAdmin().expect(200).expect({
      geometria,
      fuente: 'OSRM · © colaboradores de OpenStreetMap',
    });
    const [url] = fetchMock.mock.calls[0];
    expect(url).toEqual(
      new URL(
        'https://rutas.example.test/routed-car/route/v1/driving/-62.732025,-35.977206;-62.730147,-35.977325;-62.729491,-35.975939?overview=full&geometries=geojson',
      ),
    );
  });

  it('acepta coordenadas numéricas pequeñas y en los límites', async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json({ code: 'NoRoute' }, { status: 400 }),
    );

    await api()
      .set('Authorization', admin)
      .send({
        puntos: [
          { lat: 1e-7, long: -1e-7 },
          { lat: -90, long: 180 },
        ],
      })
      .expect(422);
  });

  it.each(['NoRoute', 'NoSegment'])(
    'permite continuar manualmente cuando OSRM devuelve %s',
    async (code) => {
      fetchMock.mockResolvedValueOnce(Response.json({ code }, { status: 400 }));
      await comoAdmin()
        .expect(422)
        .expect(({ body }) => {
          expect(body).toMatchObject({
            message:
              'No se encontró una conexión por calles. Podés dibujarla manualmente.',
          });
        });
    },
  );

  it('permite continuar manualmente si falla la conexión con OSRM', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'));
    await comoAdmin()
      .expect(503)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          message:
            'El motor de rutas no está disponible. Podés dibujar el trayecto manualmente.',
        });
      });
  });

  it('requiere JSON, ADMIN y una lista válida de puntos antes de llamar a OSRM', async () => {
    await api().send({ puntos }).expect(401);
    await api().set('Authorization', usuario).send({ puntos }).expect(403);
    await api().set('Authorization', admin).expect(415);
    await api()
      .set('Authorization', admin)
      .set('Sec-Fetch-Site', 'cross-site')
      .send({ puntos })
      .expect(403);

    for (const invalidos of [
      [puntos[0]],
      [puntos[0], null],
      [puntos[0], { ...puntos[1], lat: 91 }],
      [puntos[0], { ...puntos[1], long: '-62.73' }],
      [puntos[0], { ...puntos[1], orden: 1 }],
    ]) {
      await api()
        .set('Authorization', admin)
        .send({ puntos: invalidos })
        .expect(400);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('descarta respuestas inválidas o con una línea sin dos posiciones distintas', async () => {
    fetchMock.mockResolvedValueOnce(new Response('<html>'));
    await comoAdmin().expect(502);
    fetchMock.mockResolvedValueOnce(
      Response.json({
        code: 'Ok',
        routes: [
          {
            geometry: {
              type: 'LineString',
              coordinates: [
                [-62.73, -35.97],
                [-62.73, -35.97],
              ],
            },
          },
        ],
      }),
    );
    await comoAdmin().expect(502);
  });

  it('distingue el límite de puntos, la cuota y el tiempo de espera', async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json({ code: 'TooBig' }, { status: 400 }),
    );
    await comoAdmin().expect(422);
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 429 }));
    await comoAdmin().expect(503);
    const signal = AbortSignal.abort();
    const timeout = jest
      .spyOn(AbortSignal, 'timeout')
      .mockReturnValueOnce(signal);
    try {
      fetchMock.mockRejectedValueOnce(signal.reason);
      await comoAdmin().expect(504);
      expect(timeout).toHaveBeenCalledWith(5000);
      expect(fetchMock.mock.lastCall?.[1]?.signal).toBe(signal);
    } finally {
      timeout.mockRestore();
    }
  });

  it('identifica la app y aplica la cuota local al servidor de demostración', async () => {
    process.env.OSRM_BASE_URL = 'https://routing.openstreetmap.de/routed-car/';
    try {
      fetchMock.mockResolvedValueOnce(
        Response.json({ code: 'NoRoute' }, { status: 400 }),
      );
      await comoAdmin().expect(422);
      await comoAdmin().expect(503);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(
        new Headers(fetchMock.mock.calls[0][1]?.headers).get('User-Agent'),
      ).toBe('CiudadLimpia/1.0');
    } finally {
      process.env.OSRM_BASE_URL = baseUrl;
    }
  });
});
