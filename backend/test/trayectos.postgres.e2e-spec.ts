import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';
import type { DireccionResponseDto } from '../src/direccion/dto/direccion-response.dto';
import type { TrayectoResponseDto } from '../src/trayecto/trayecto.dto';
import type { PublicUser } from '../src/accounts/account.schemas';
import { PrismaService } from '../src/prisma/prisma.service';
import { PuntosTrayectoService } from '../src/punto-trayecto/puntos-trayecto.service';

const databaseUrl = process.env.TEST_DATABASE_URL;
const describePostgres = databaseUrl ? describe : describe.skip;

describePostgres('Direcciones compartidas (HTTP y PostgreSQL)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let admin: string;
  let tipoId: string;
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
  const frente = { calle, altura: 850, lat: -35.97, long: -62.73 };
  const frenteVecino = { calle, altura: 852, lat: -35.98, long: -62.74 };
  const { lat, long, ...referencia } = frente;
  const {
    lat: latVecino,
    long: longVecino,
    ...referenciaVecina
  } = frenteVecino;
  const origen = { orden: 0, lat, long, direccion: referencia };
  const destino = {
    orden: 1,
    lat: latVecino,
    long: longVecino,
    direccion: referenciaVecina,
  };
  const entrada = { nombre, localidadId, geometria, puntos: [origen, destino] };
  const emails = ['admin', 'vecino', 'vecina'].map(
    (rol) => `${rol}-${clave}@example.test`,
  );
  const api = () => request(app.getHttpServer());
  const guardar = () =>
    api().post('/api/trayectos').set('Authorization', admin);
  const editar = (id: string) =>
    api().patch(`/api/trayectos/${id}`).set('Authorization', admin);
  const leer = (id: string) =>
    api().get(`/api/trayectos/${id}`).set('Authorization', admin);

  beforeAll(async () => {
    const config = new ConfigService({
      DATABASE_URL: databaseUrl,
      JWT_SECRET: 'test-only-secret-at-least-32-characters',
    });
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ConfigService)
      .useValue(config)
      .compile();
    app = module.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    const usuario = await prisma.user.create({
      data: { email: emails[0], role: 'ADMIN', passwordHash: 'sin-uso' },
    });
    admin = `Bearer ${await app.get(JwtService).signAsync({ sub: usuario.id })}`;
    ({ id: tipoId } = await prisma.tipoPuntoLimpio.create({
      data: { nombre },
    }));
  });

  afterAll(async () => {
    if (!app) return;
    try {
      if (!prisma) return;
      await prisma.user.deleteMany({ where: { email: { in: emails } } });
      await prisma.puntoLimpio.deleteMany({ where: { tipoId, nombre } });
      await prisma.tipoPuntoLimpio.deleteMany({ where: { nombre } });
      await prisma.trayecto.deleteMany({
        where: { nombre: { in: [nombre, nombreEditado] } },
      });
      await prisma.direccion.deleteMany({
        where: { calle: { calle: { in: [calle, calleRollback] } } },
      });
      await prisma.calle.deleteMany({
        where: { calle: { in: [calle, calleRollback] } },
      });
    } finally {
      await app.close();
    }
  });

  it('comparte y corrige el pin sin alterar la LineString ni divulgar etiquetas', async () => {
    const alta = () => api().post('/direcciones').set('Authorization', admin);
    await alta()
      .send({ ...frente, altura: undefined })
      .expect(400);
    const direccion = (await alta().send(frente).expect(201))
      .body as DireccionResponseDto;
    await alta().send(frente).expect(409);
    const direccionId = direccion.id;

    const cliente = { name: 'Ana', lastName: 'Pérez' };
    const registro = (email: string, domicilios: object[]) =>
      api()
        .post('/auth/register')
        .send({
          email,
          password: 'clave-prueba-2026',
          cliente: { ...cliente, domicilios },
        });
    const vecino = await registro(emails[1], [
      { direccion: frente, etiqueta: 'Casa' },
    ]).expect(201);
    const sesion = (vecino.get('Set-Cookie') ?? [''])[0].split(';')[0];
    const usuario = vecino.body as PublicUser;
    const vecina = (
      await registro(emails[2], [{ direccionId, etiqueta: 'Trabajo' }]).expect(
        201,
      )
    ).body as PublicUser;
    expect(usuario.cliente?.domicilios).toEqual([
      { ...direccion, etiqueta: 'Casa' },
    ]);
    expect(vecina.cliente?.domicilios).toEqual([
      { ...direccion, etiqueta: 'Trabajo' },
    ]);

    await guardar()
      .send({
        ...entrada,
        puntos: [{ ...origen, lat: lat - 0.001 }, destino],
      })
      .expect(409)
      .expect({
        statusCode: 409,
        code: 'PIN_DIRECCION_DISTINTO',
        message: 'El pin enviado difiere del pin guardado para esta dirección',
        direccion,
      });

    const trayecto = (
      await guardar()
        .send({
          ...entrada,
          puntos: [destino, { orden: 0, direccionId }],
        })
        .expect(201)
    ).body as TrayectoResponseDto;
    expect(trayecto).toMatchObject({
      geometria,
      puntos: [
        { orden: 0, direccionId, lat, long, direccion },
        { orden: 1, lat: latVecino, long: longVecino },
      ],
    });

    const punto = await api()
      .post('/puntos-limpios')
      .set('Authorization', admin)
      .send({ nombre, tipoId, direccionId, lat, long })
      .expect(201);
    const puntoId = (punto.body as { id: string }).id;
    const pin = { lat: lat - 0.002, long: long - 0.002 };
    await api()
      .patch(`/direcciones/${direccionId}`)
      .set('Cookie', sesion)
      .send(pin)
      .expect(403);
    await api()
      .patch(`/direcciones/${direccionId}`)
      .set('Authorization', admin)
      .send({ ...referencia, ...pin })
      .expect(200)
      .expect({ ...direccion, ...pin });

    await leer(trayecto.id)
      .expect(200)
      .expect({
        ...trayecto,
        puntos: [
          {
            ...trayecto.puntos[0],
            ...pin,
            direccion: { ...direccion, ...pin },
          },
          trayecto.puntos[1],
        ],
      });
    await api()
      .get(`/puntos-limpios/${puntoId}`)
      .expect(200)
      .expect({ id: puntoId, nombre, tipoId, direccionId, ...pin });
    const editarPunto = () =>
      api().patch(`/puntos-limpios/${puntoId}`).set('Authorization', admin);
    await editarPunto().send({ lat, long }).expect(409);
    await editarPunto()
      .send(pin)
      .expect(200)
      .expect({ id: puntoId, nombre, tipoId, direccionId, ...pin });
    const nuevoFrente = trayecto.puntos[1].direccionId;
    await editarPunto().send({ direccionId: nuevoFrente }).expect(200).expect({
      id: puntoId,
      nombre,
      tipoId,
      direccionId: nuevoFrente,
      lat: latVecino,
      long: longVecino,
    });
    await api()
      .get('/auth/me')
      .set('Cookie', sesion)
      .expect(200)
      .expect({
        ...usuario,
        cliente: {
          ...usuario.cliente,
          domicilios: [{ ...direccion, ...pin, etiqueta: 'Casa' }],
        },
      });
    await api()
      .get('/api/geocodificacion/directa')
      .set('Authorization', admin)
      .query(referencia)
      .expect(200)
      .expect({
        sugerencias: [{ ...referencia, ...pin }],
        fuente: 'Catálogo de Ciudad Limpia',
      });

    await api()
      .patch(`/users/${usuario.id}`)
      .set('Cookie', sesion)
      .send({
        cliente: {
          ...cliente,
          domicilios: [{ direccionId, etiqueta: 'Otra' }],
        },
      })
      .expect(200);
    await api()
      .patch(`/users/${usuario.id}`)
      .set('Cookie', sesion)
      .send({ cliente: { ...cliente, domicilios: [] } })
      .expect(200);
    await api()
      .delete(`/users/${usuario.id}`)
      .set('Authorization', admin)
      .set('Content-Type', 'application/json')
      .expect(204);
    expect(
      await prisma.clienteDireccion.findMany({ where: { direccionId } }),
    ).toEqual([
      { clienteId: vecina.cliente!.id, direccionId, etiqueta: 'Trabajo' },
    ]);
  });

  it('confirma el alta aunque la transacción demore más de cinco segundos', async () => {
    const servicio = app.get<PuntosTrayectoService>(PuntosTrayectoService);
    const resolver = servicio.resolverReferencias.bind(
      servicio,
    ) as PuntosTrayectoService['resolverReferencias'];
    const demora = jest
      .spyOn(servicio, 'resolverReferencias')
      .mockImplementationOnce(async (tx, puntos) => {
        await tx.$executeRaw`SELECT pg_sleep(6)`;
        return resolver(tx, puntos);
      });

    try {
      const guardado = await guardar()
        .send({
          ...entrada,
          puntos: [
            { ...origen, direccion: { ...referencia, altura: 855 } },
            destino,
          ],
        })
        .expect(201);
      const { id } = guardado.body as TrayectoResponseDto;
      await leer(id).expect(200).expect(guardado.body);
    } finally {
      demora.mockRestore();
    }
  }, 25000);

  it('rechaza referencias inexistentes y revierte las escrituras del alta y la edición', async () => {
    const guardado = await guardar()
      .send({
        ...entrada,
        puntos: [
          { ...origen, direccion: { ...referencia, altura: 860 } },
          destino,
        ],
      })
      .expect(201);
    const { id } = guardado.body as TrayectoResponseDto;
    const puntos = [
      { ...origen, direccion: { ...referencia, calle: calleRollback } },
      { orden: 1, direccionId: randomUUID() },
    ];

    await guardar()
      .send({ ...entrada, localidadId: '99999999', puntos })
      .expect(400);
    await guardar()
      .send({ ...entrada, puntos })
      .expect(400);
    await editar(id)
      .send({ ...entrada, nombre: nombreEditado, puntos })
      .expect(400);
    await editar(randomUUID())
      .send({
        ...entrada,
        puntos: [puntos[0], destino],
      })
      .expect(404);
    expect(await prisma.calle.count({ where: { calle: calleRollback } })).toBe(
      0,
    );
    await leer(id).expect(200).expect(guardado.body);
  });

  it('elimina el trayecto y sus puntos, conservando las direcciones', async () => {
    const guardado = await guardar().send(entrada).expect(201);
    const creado = guardado.body as TrayectoResponseDto;
    await api()
      .delete(`/api/trayectos/${creado.id}`)
      .set('Authorization', admin)
      .set('Content-Type', 'application/json')
      .expect(204);
    await leer(creado.id).expect(404);
    expect(await prisma.puntoTrayecto.count({ where: { trayectoId: creado.id } })).toBe(0);
    const ids = [...new Set(creado.puntos.map(({ direccionId }) => direccionId))];
    expect(await prisma.direccion.count({ where: { id: { in: ids } } })).toBe(ids.length);
  });

  it('guarda la línea editada y el orden de las referencias compartidas', async () => {
    const guardado = await guardar()
      .send({
        ...entrada,
        puntos: [
          { ...origen, direccion: { ...referencia, altura: 861 } },
          destino,
        ],
      })
      .expect(201);
    const { id, puntos } = guardado.body as TrayectoResponseDto;
    const geometriaEditada = {
      ...geometria,
      coordinates: geometria.coordinates.toReversed(),
    };
    const puntosEditados = [
      { orden: 0, direccionId: puntos[1].direccionId },
      { orden: 1, direccionId: puntos[0].direccionId },
    ];
    const edicion = {
      ...entrada,
      nombre: nombreEditado,
      geometria: geometriaEditada,
    };
    const editado = await editar(id)
      .send({ ...edicion, puntos: puntosEditados.toReversed() })
      .expect(200);
    expect(editado.body).toMatchObject({
      ...edicion,
      id,
      puntos: puntosEditados,
    });
    await leer(id).expect(200).expect(editado.body);
  });

  it('comparte una sola fila en altas simultáneas y PostgreSQL rechaza duplicados y nulos', async () => {
    const frenteSimultaneo = { ...referencia, altura: 870 };
    const solicitud = {
      ...entrada,
      puntos: [{ ...origen, direccion: frenteSimultaneo }, destino],
    };
    const respuestas = await Promise.all([
      guardar().send(solicitud).expect(201),
      guardar().send(solicitud).expect(201),
    ]);
    const [primera, segunda] = respuestas.map(
      ({ body }) => body as TrayectoResponseDto,
    );
    expect(primera.puntos[0].direccionId).toBe(segunda.puntos[0].direccionId);
    const calleRegistro = await prisma.calle.findUniqueOrThrow({
      where: { clave: calle.toLowerCase() },
    });
    const { id: calleId } = calleRegistro;
    expect(
      await prisma.direccion.count({
        where: { calleId, altura: frenteSimultaneo.altura },
      }),
    ).toBe(1);
    await expect(
      prisma.direccion.create({
        data: { calleId, altura: frenteSimultaneo.altura, lat, long },
      }),
    ).rejects.toMatchObject({ code: 'P2002' });
    await expect(prisma.$executeRaw`
      INSERT INTO "Direccion" (id, "calleId", altura, lat, long)
      VALUES (${randomUUID()}, ${calleId}, 999, NULL, ${long})
    `).rejects.toMatchObject({
      meta: {
        driverAdapterError: { cause: { kind: 'NullConstraintViolation' } },
      },
    });
  });
});
