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

const databaseUrl = process.env.TEST_DATABASE_URL;
const describePostgres = databaseUrl ? describe : describe.skip;

describePostgres('Trayectos (HTTP y PostgreSQL)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let admin: string;
  let privadaId: string;
  const clave = randomUUID();
  const nombre = `Centro ${clave}`;
  const nombreEditado = `Centro editado ${clave}`;
  const calle = `Roca ${clave}`;
  const calleRollback = `Calle a revertir ${clave}`;
  const localidadId = '06826050';
  const geometria = {
    type: 'LineString',
    coordinates: [
      [-62.73, -35.97],
      [-62.735, -35.97],
      [-62.74, -35.98],
    ],
  };
  const origen = { orden: 0, lat: -35.97, long: -62.73 };
  const destino = { orden: 1, lat: -35.98, long: -62.74 };
  const entrada = { nombre, localidadId, geometria };
  const pin = {
    orden: 3,
    lat: -35.98 - parseInt(clave.slice(0, 6), 16) / 10_000_000_000,
    long: -62.7421,
  };
  const pinSimultaneo = { ...pin, lat: pin.lat - 0.001 };
  const consultarGeoref = jest.spyOn(globalThis, 'fetch');
  const api = () => request(app.getHttpServer());
  const guardar = () =>
    api().post('/api/trayectos').set('Authorization', admin);
  const editar = (id: string) =>
    api().patch(`/api/trayectos/${id}`).set('Authorization', admin);

  beforeAll(async () => {
    const config = new ConfigService(
      {
        DATABASE_URL: databaseUrl,
        JWT_SECRET: 'test-only-secret-at-least-32-characters',
      },
      { skipProcessEnv: true },
    );
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ConfigService)
      .useValue(config)
      .compile();
    app = module.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    const usuario = await prisma.user.create({
      data: {
        email: `${clave}@example.test`,
        role: 'ADMIN',
        passwordHash: 'sin-uso',
        cliente: {
          create: {
            name: 'Prueba',
            lastName: 'Trayectos',
            domicilios: { create: { direccion: `${calle} 50` } },
          },
        },
      },
      include: { cliente: { include: { domicilios: true } } },
    });
    privadaId = usuario.cliente!.domicilios[0].id;
    admin = `Bearer ${await app.get(JwtService).signAsync({ sub: usuario.id })}`;
  });

  afterAll(async () => {
    consultarGeoref.mockRestore();
    if (!app) return;
    await prisma.trayecto.deleteMany({
      where: { nombre: { in: [nombre, nombreEditado] } },
    });
    await prisma.direccion.deleteMany({
      where: {
        clienteId: null,
        puntosTrayecto: { none: {} },
        puntosLimpios: { none: {} },
        OR: [
          { calle: { calle: { in: [calle, calleRollback] } } },
          {
            calleId: null,
            direccion: null,
            lat: { in: [pin.lat, pinSimultaneo.lat] },
            long: pin.long,
          },
        ],
      },
    });
    await prisma.calle.deleteMany({
      where: { calle: { in: [calle, calleRollback] } },
    });
    await prisma.user.deleteMany({ where: { email: `${clave}@example.test` } });
    await app.close();
  });

  it('guarda sugerencias de Georef y un pin sin dirección durante una caída del proveedor', async () => {
    await api()
      .get('/api/localidades')
      .set('Authorization', admin)
      .expect(200)
      .expect([{ id: localidadId, nombre: 'Trenque Lauquen' }]);
    consultarGeoref
      .mockResolvedValueOnce(
        Response.json({
          direcciones: [
            {
              localidad_censal: { id: localidadId },
              calle: { nombre: calle },
              altura: { valor: 50 },
              ubicacion: { lat: -35.971, lon: -62.731 },
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          ubicacion: { calle: { id: `${localidadId}0001135`, nombre: calle } },
        }),
      )
      .mockRejectedValue(new TypeError('Georef no disponible'));
    const directa = await api()
      .get('/api/geocodificacion/directa')
      .set('Authorization', admin)
      .query({ calle, altura: 50 })
      .expect(200);
    const { sugerencias } = directa.body as {
      sugerencias: { calle: string; altura: number }[];
    };
    const inversa = () =>
      api().get('/api/geocodificacion/inversa').set('Authorization', admin);
    const parcial = await inversa()
      .query({ lat: destino.lat, long: destino.long })
      .expect(200);
    const { direccionSugerida, lat, long } = parcial.body as {
      lat: number;
      long: number;
      direccionSugerida: { calle: string; altura: null };
    };
    await inversa().query({ lat: pin.lat, long: pin.long }).expect(503);

    const guardado = await guardar()
      .send({
        ...entrada,
        nombre: ` ${nombre} `,
        puntos: [
          { orden: destino.orden, lat, long, direccion: direccionSugerida },
          { ...origen, direccion: { calle } },
          { ...origen, orden: 2, direccion: { calle, altura: null } },
          pin,
          {
            ...origen,
            orden: 4,
            direccion: {
              calle: sugerencias[0].calle,
              altura: sugerencias[0].altura,
            },
          },
        ],
      })
      .expect(201);
    const creado = guardado.body as {
      id: string;
      puntos: { direccionId: string }[];
    };
    const [primero, segundo, tercero, sinCalle, completa] = creado.puntos;
    expect(primero.direccionId).toBe(tercero.direccionId);
    expect(primero.direccionId).not.toBe(segundo.direccionId);
    expect(completa.direccionId).not.toBe(privadaId);
    await api()
      .patch(`/direcciones/${sinCalle.direccionId}`)
      .set('Authorization', admin)
      .send({ lat: null, long: null })
      .expect(400);
    await api()
      .get('/direcciones/puntos-limpios')
      .query({ buscar: calle })
      .set('Authorization', admin)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              id: primero.direccionId,
              direccion: calle,
            }),
            expect.objectContaining({
              id: completa.direccionId,
              direccion: `${calle} 50`,
            }),
          ]),
        );
      });

    expect(creado).toMatchObject({
      ...entrada,
      puntos: [
        { ...origen, direccion: { calle, altura: null } },
        { ...destino, direccion: { calle, altura: null } },
        { ...origen, orden: 2 },
        { ...pin, direccion: { calle: null, altura: null } },
        { ...origen, orden: 4, direccion: { calle, altura: 50 } },
      ],
    });
    const otro = await guardar()
      .send({
        ...entrada,
        puntos: [
          { ...destino, orden: 0, direccion: { calle, altura: 50 } },
          { ...origen, orden: 1, direccionId: primero.direccionId },
          { ...pin, orden: 2 },
        ],
      })
      .expect(201);
    expect(otro.body).toMatchObject({
      puntos: [
        {
          ...destino,
          orden: 0,
          direccionId: completa.direccionId,
          direccion: { lat: origen.lat },
        },
        { ...origen, orden: 1, direccionId: primero.direccionId },
        { ...pin, orden: 2, direccionId: sinCalle.direccionId },
      ],
    });
    await api()
      .get(`/api/trayectos/${creado.id}`)
      .set('Authorization', admin)
      .expect(200)
      .expect(creado);
    const listado = await api()
      .get('/api/trayectos')
      .set('Authorization', admin)
      .expect(200);
    expect(listado.body).toEqual(expect.arrayContaining([creado]));
  });

  it('rechaza una localidad desconocida y revierte la referencia nueva al rechazar un domicilio', async () => {
    const puntos = [
      { ...origen, direccion: { calle: calleRollback } },
      { ...destino, direccionId: privadaId },
    ];
    const cantidad = await prisma.trayecto.count({ where: { nombre } });
    await guardar()
      .send({ ...entrada, localidadId: '99999999', puntos })
      .expect(400);
    await guardar()
      .send({ ...entrada, puntos })
      .expect(400);
    expect(await prisma.trayecto.count({ where: { nombre } })).toBe(cantidad);
    expect(await prisma.calle.count({ where: { calle: calleRollback } })).toBe(
      0,
    );
  });

  it('reabre el trayecto con el mismo ID, la línea editada y el nuevo orden de puntos', async () => {
    const guardado = await guardar()
      .send({
        ...entrada,
        puntos: [
          { ...origen, direccion: { calle } },
          { ...destino, direccion: { calle } },
          { ...pin, orden: 2 },
        ],
      })
      .expect(201);
    const { id, puntos } = guardado.body as {
      id: string;
      puntos: { direccionId: string }[];
    };
    const movido = { orden: 1, lat: -35.971, long: -62.73 };
    const geometriaEditada = {
      type: 'LineString',
      coordinates: [
        [-62.74, -35.98],
        [-62.733, -35.975],
        [-62.73, -35.971],
      ],
    };
    const puntosEditados = [
      { ...destino, orden: 0, direccionId: puntos[1].direccionId },
      { ...movido, direccionId: puntos[0].direccionId },
    ];
    const edicion = {
      ...entrada,
      nombre: nombreEditado,
      geometria: geometriaEditada,
      puntos: puntosEditados.toReversed(),
    };

    const editado = await editar(id)
      .send(edicion)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({ ...edicion, id, puntos: puntosEditados });
      });
    await api()
      .get(`/api/trayectos/${id}`)
      .set('Authorization', admin)
      .expect(200)
      .expect(editado.body);
  });

  it('conserva el trayecto y revierte la referencia nueva al rechazar la edición', async () => {
    const guardado = await guardar()
      .send({
        ...entrada,
        puntos: [
          { ...origen, direccion: { calle } },
          { ...destino, direccion: { calle } },
        ],
      })
      .expect(201);
    const { id } = guardado.body as { id: string };
    const edicion = {
      ...entrada,
      nombre: nombreEditado,
      puntos: [
        { ...origen, direccion: { calle: calleRollback } },
        { ...destino, direccionId: privadaId },
      ],
    };

    await editar(id).send(edicion).expect(400);
    await editar(randomUUID())
      .send({ ...edicion, puntos: [edicion.puntos[0], { ...pin, orden: 1 }] })
      .expect(404);
    await api()
      .get(`/api/trayectos/${id}`)
      .set('Authorization', admin)
      .expect(200)
      .expect(guardado.body);
    expect(await prisma.calle.count({ where: { calle: calleRollback } })).toBe(
      0,
    );
  });

  it('comparte un pin público creado por dos altas simultáneas', async () => {
    const puntos = [
      { ...pinSimultaneo, orden: 0 },
      { ...destino, direccion: { calle, altura: 51 } },
    ];
    const respuestas = await Promise.all([
      guardar()
        .send({ ...entrada, puntos })
        .expect(201),
      guardar()
        .send({ ...entrada, puntos })
        .expect(201),
    ]);
    const [primera, segunda] = respuestas.map(
      ({ body }) =>
        body as {
          puntos: { direccionId: string }[];
        },
    );
    expect(primera.puntos[0].direccionId).toBe(segunda.puntos[0].direccionId);
  });
});
