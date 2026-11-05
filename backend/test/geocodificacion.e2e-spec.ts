import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Geocodificación (HTTP)', () => {
  let app: INestApplication<App>;
  let admin: string;
  let user: string;
  const findUnique = jest.fn();
  const findFirst = jest.fn();
  const fetchMock = jest.spyOn(globalThis, 'fetch');
  const directa = '/geocodificacion/directa?calle=Villegas&altura=555';
  const inversa = '/geocodificacion/inversa?lat=-35.97&long=-62.73';
  const fuente = 'Servicio Georef – argentina.gob.ar/georef';

  beforeAll(async () => {
    process.env.JWT_SECRET = 'test-only-secret-at-least-32-characters';
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue({ user: { findUnique }, direccion: { findFirst } })
      .compile();
    app = module.createNestApplication();
    configureApp(app);
    await app.init();
    const jwt = app.get(JwtService);
    admin = await jwt.signAsync({ sub: 'admin' });
    user = await jwt.signAsync({ sub: 'user' });
  });

  beforeEach(() => {
    fetchMock.mockReset();
    findFirst.mockReset().mockResolvedValue(null);
    findUnique.mockImplementation(({ where }: { where: { id: string } }) => ({
      id: where.id,
      role: where.id === 'admin' ? 'ADMIN' : 'USER',
    }));
  });

  afterAll(async () => {
    fetchMock.mockRestore();
    await app.close();
  });

  function asAdmin(path: string) {
    return request(app.getHttpServer())
      .get(path)
      .set('Authorization', `Bearer ${admin}`);
  }

  it('reutiliza las coordenadas del catálogo de direcciones públicas', async () => {
    findFirst.mockResolvedValue({
      calle: { calle: 'Villegas' },
      lat: -35.97,
      long: -62.73,
    });
    await asAdmin(directa)
      .expect(200)
      .expect({
        fuente: 'Catálogo de Ciudad Limpia',
        sugerencias: [
          { calle: 'Villegas', altura: 555, lat: -35.97, long: -62.73 },
        ],
      });
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          clienteId: null,
          calle: { clave: 'villegas' },
          altura: 555,
          lat: { not: null },
          long: { not: null },
        },
      }),
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('devuelve hasta tres sugerencias válidas y únicas de la ciudad', async () => {
    const direccion = {
      localidad_censal: { id: '06826050' },
      calle: { nombre: 'VILLEGAS' },
      altura: { valor: 555 },
      ubicacion: { lat: -35.97, lon: -62.73 },
    };
    fetchMock.mockResolvedValue(
      Response.json({
        direcciones: [
          { ...direccion, localidad_censal: { id: '06826020' } },
          { ...direccion, ubicacion: { lat: null, lon: null } },
          direccion,
          direccion,
          ...['GENERAL PAZ', 'ROCA', 'URUGUAY'].map((nombre) => ({
            ...direccion,
            calle: { nombre },
          })),
        ],
      }),
    );

    await asAdmin(directa)
      .expect(200)
      .expect({
        fuente,
        sugerencias: ['VILLEGAS', 'GENERAL PAZ', 'ROCA'].map((calle) => ({
          calle,
          altura: 555,
          lat: -35.97,
          long: -62.73,
        })),
      });
  });
  it('devuelve una lista vacía si Georef solo reconoce la dirección', async () => {
    fetchMock.mockResolvedValue(
      Response.json({
        direcciones: [
          {
            localidad_censal: { id: '06826050' },
            calle: { nombre: 'VILLEGAS' },
            altura: { valor: 555 },
            ubicacion: { lat: null, lon: null },
          },
        ],
      }),
    );
    await asAdmin(directa).expect(200).expect({ sugerencias: [], fuente });
  });

  it.each([
    [
      { id: '068260500001135', nombre: 'URUGUAY' },
      { calle: 'URUGUAY', altura: null },
    ],
    [
      { id: '068260500001020', nombre: 'RIVADAVIA', altura: 45 },
      { calle: 'RIVADAVIA', altura: 45 },
    ],
    [{ id: '068260200001135', nombre: 'URUGUAY' }, null],
    [{ id: null, nombre: null }, null],
  ])(
    'conserva el pin consultado con calle de Georef %j',
    async (calle, direccionSugerida) => {
      fetchMock.mockResolvedValue(
        Response.json({ ubicacion: { calle, lat: -35.98, lon: -62.74 } }),
      );
      await asAdmin(inversa).expect(200).expect({
        lat: -35.97,
        long: -62.73,
        direccionSugerida,
        fuente,
      });
    },
  );

  it.each([directa, inversa])('requiere ADMIN para %s', async (path) => {
    await request(app.getHttpServer()).get(path).expect(401);
    await request(app.getHttpServer())
      .get(path)
      .set('Authorization', `Bearer ${user}`)
      .expect(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    '/geocodificacion/directa?calle=Villegas&altura=0',
    '/geocodificacion/directa?calle=Villegas&altura=2.5',
    '/geocodificacion/inversa?lat=91&long=-62.73',
    '/geocodificacion/inversa?lat=-35.97&long=181',
    '/geocodificacion/inversa?lat=&long=-62.73',
  ])('valida parámetros de %s', async (path) => {
    await asAdmin(path).expect(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('distingue problemas de formato, cuota, conexión y timeout', async () => {
    fetchMock.mockResolvedValueOnce(new Response('inválido'));
    await asAdmin(directa).expect(502);
    fetchMock.mockResolvedValueOnce(Response.json({}));
    await asAdmin(inversa).expect(502);
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 429 }));
    await asAdmin(directa).expect(503);
    fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'));
    await asAdmin(inversa).expect(503);
    fetchMock.mockImplementationOnce(async () => {
      await Promise.resolve();
      throw new DOMException('Timeout', 'TimeoutError');
    });
    const signal = AbortSignal.abort();
    const timeout = jest
      .spyOn(AbortSignal, 'timeout')
      .mockReturnValueOnce(signal);
    try {
      await asAdmin(inversa).expect(504);
      expect(timeout).toHaveBeenCalledWith(5000);
    } finally {
      timeout.mockRestore();
    }
  });
});
