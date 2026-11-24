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
import { PuntosTrayectoService } from '../src/trayecto/puntos-trayecto.service';

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
  const calleCobertura = `Monferrand ${clave}`;
  const calleIdPrueba = randomUUID();
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
  const entrada = {
    nombre,
    localidadId,
    zonaId: '3b37670f-24b7-4a4b-afdf-1b13ca5af001',
    geometria,
    puntos: [origen, destino],
    tramos: [{ desde: 0, hasta: 2, calleId: calleIdPrueba }],
  };
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
    await prisma.calle.create({
      data: { id: calleIdPrueba, calle, clave: calle.toLowerCase() },
    });
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
        where: {
          calle: { calle: { in: [calle, calleRollback, calleCobertura] } },
        },
      });
      await prisma.calle.deleteMany({
        where: { calle: { in: [calle, calleRollback, calleCobertura] } },
      });
    } finally {
      await app.close();
    }
  });

  it('persiste los materiales y la visibilidad del catálogo', async () => {
    const nombreTipo = `Envases ${clave}`;
    const material = `Vidrio ${clave}`;
    const tipos = '/api/tipos-punto-limpio';
    const puntos = '/api/puntos-limpios';
    const alta = await api()
      .post(tipos)
      .set('Authorization', admin)
      .send({
        nombre: nombreTipo,
        materiales: [material],
        logo: 'botellero',
        colorFondo: '#148640',
      })
      .expect(201);
    const { id } = alta.body as { id: string };
    try {
      expect(alta.body).toMatchObject({
        logo: 'botellero',
        colorFondo: '#148640',
      });
      const tipo = await prisma.tipoPuntoLimpio.findUniqueOrThrow({
        where: { id },
        include: { residuos: { include: { residuo: true } } },
      });
      expect(tipo.residuos.map(({ residuo }) => residuo.nombre)).toEqual([
        material,
      ]);
      const respuesta = await api()
        .post(puntos)
        .set('Authorization', admin)
        .send({
          nombre,
          tipoId: id,
          direccion: { calle, altura: 1800 },
          lat,
          long,
          estado: 'INACTIVO',
        })
        .expect(201);
      const { id: puntoId } = respuesta.body as { id: string };
      await api().get(`${puntos}/${puntoId}`).expect(404);
      const adminLista = await api()
        .get(puntos + '/administracion')
        .set('Authorization', admin)
        .expect(200);
      expect(
        (adminLista.body as { id: string }[]).some(({ id }) => id === puntoId),
      ).toBe(true);
      await api()
        .patch(`${puntos}/${puntoId}`)
        .set('Authorization', admin)
        .send({ estado: 'ACTIVO' })
        .expect(200);
      await api().get(`${puntos}/${puntoId}`).expect(200);
    } finally {
      await prisma.puntoLimpio.deleteMany({ where: { tipoId: id } });
      await prisma.tipoPuntoLimpio.delete({ where: { id } });
      await prisma.residuo.deleteMany({ where: { nombre: material } });
    }
  });

  it('permite administrar zonas y aplica unicidad al normalizar el nombre', async () => {
    const ruta = '/api/zonas';
    const datos = { nombre: `Área ${clave}`, localidadId };
    await api().get(ruta).expect(401);
    const alta = await api()
      .post(ruta)
      .set('Authorization', admin)
      .send(datos)
      .expect(201);
    const { id } = alta.body as { id: string };
    try {
      await api()
        .post(ruta)
        .set('Authorization', admin)
        .send({ ...datos, nombre: ` AREA  ${clave} ` })
        .expect(409);
      await api()
        .patch(`${ruta}/${id}`)
        .set('Authorization', admin)
        .send({ descripcion: 'Sector de prueba' })
        .expect(200);
      await api()
        .delete(`${ruta}/${id}`)
        .set('Authorization', admin)
        .set('Content-Type', 'application/json')
        .expect(204);
    } finally {
      await prisma.zona.deleteMany({ where: { id } });
    }
  });

  it('guarda y reemplaza tramos confirmados junto con la línea', async () => {
    const { id: calleId } = await prisma.calle.create({
      data: { calle: calleCobertura, clave: calleCobertura.toLowerCase() },
    });
    const datos = {
      ...entrada,
      puntos: [origen, destino].map((punto) => ({
        ...punto,
        direccion: { ...punto.direccion, calle: calleCobertura },
      })),
    };
    const tramo = { desde: 0, hasta: 2, calleId };
    const { id } = (
      await guardar()
        .send({ ...datos, tramos: [tramo] })
        .expect(201)
    ).body as TrayectoResponseDto;
    await leer(id).expect(({ body }: { body: TrayectoResponseDto }) => {
      expect(body.tramos).toEqual([
        {
          ...tramo,
          lado: 'AMBOS',
          calle: { id: calleId, calle: calleCobertura },
        },
      ]);
    });
    const asignados = [
      { ...tramo, hasta: 1, lado: 'IZQUIERDA' },
      { desde: 1, hasta: 2, calleId: calleIdPrueba, lado: 'DERECHA' },
    ];
    await editar(id)
      .send({ ...datos, tramos: asignados, zonaId: undefined })
      .expect(200);
    await leer(id).expect(({ body }: { body: TrayectoResponseDto }) => {
      expect(body.tramos).toMatchObject(asignados);
      expect(body.zonaId).toBe(entrada.zonaId);
    });
    await editar(id)
      .send({ ...datos, tramos: undefined })
      .expect(400);
    await editar(id)
      .send({ ...datos, tramos: asignados.slice(0, 1) })
      .expect(400);
    await editar(id)
      .send({ ...datos, tramos: [{ ...tramo, calleId: randomUUID() }] })
      .expect(400);
    await editar(id)
      .send({ ...datos, tramos: [tramo], zonaId: randomUUID() })
      .expect(400);
    await api()
      .delete(`/api/zonas/${entrada.zonaId}`)
      .set('Authorization', admin)
      .set('Content-Type', 'application/json')
      .expect(409);
    await leer(id).expect(({ body }: { body: TrayectoResponseDto }) => {
      expect(body.geometria).toEqual(geometria);
      expect(body.tramos).toMatchObject(asignados);
    });
    await editar(id)
      .send({ ...datos, tramos: [] })
      .expect(400);
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
      .expect({
        id: puntoId,
        nombre,
        tipoId,
        direccionId,
        ...pin,
        estado: 'ACTIVO',
        direccion: direccion.direccion,
      });
    const editarPunto = () =>
      api().patch(`/puntos-limpios/${puntoId}`).set('Authorization', admin);
    await editarPunto().send({ lat, long }).expect(409);
    await editarPunto()
      .send(pin)
      .expect(200)
      .expect({
        id: puntoId,
        nombre,
        tipoId,
        direccionId,
        ...pin,
        estado: 'ACTIVO',
        direccion: direccion.direccion,
      });
    const nuevoFrente = trayecto.puntos[1].direccionId;
    await editarPunto().send({ direccionId: nuevoFrente }).expect(200).expect({
      id: puntoId,
      nombre,
      tipoId,
      direccionId: nuevoFrente,
      lat: latVecino,
      long: longVecino,
      estado: 'ACTIVO',
      direccion: trayecto.puntos[1].direccion.direccion,
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

    const elegir = () =>
      api().patch('/users/me/domicilio-actual').set('Cookie', sesion);
    await elegir().send({ direccionId: nuevoFrente }).expect(404);
    await api()
      .patch(`/users/${usuario.id}`)
      .set('Cookie', sesion)
      .send({
        cliente: {
          ...cliente,
          domicilios: [{ direccionId }, { direccionId: nuevoFrente }],
        },
      })
      .expect(200);

    await Promise.all([
      elegir().send({ direccionId }).expect(204),
      elegir().send({ direccionId: nuevoFrente }).expect(204),
    ]);
    expect(
      await prisma.clienteDireccion.count({
        where: { clienteId: usuario.cliente!.id, esActual: true },
      }),
    ).toBe(1);

    await elegir().send({ direccionId: nuevoFrente }).expect(204);
    await elegir().send({ direccionId }).expect(204);
    await elegir().send({ direccionId: randomUUID() }).expect(404);
    const sesionActualizada = await api()
      .get('/auth/me')
      .set('Cookie', sesion)
      .expect(200);
    expect(sesionActualizada.body).toMatchObject({
      domicilioActualId: direccionId,
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
      .expect(200)
      .expect(({ body }) => {
        expect(body).toHaveProperty('domicilioActualId', direccionId);
      });
    await api()
      .patch(`/users/${usuario.id}`)
      .set('Cookie', sesion)
      .send({ cliente: { ...cliente, domicilios: [] } })
      .expect(200);
    const sinDomicilio = await api()
      .get('/auth/me')
      .set('Cookie', sesion)
      .expect(200);
    expect(sinDomicilio.body).not.toHaveProperty('domicilioActualId');
    await api()
      .delete(`/users/${usuario.id}`)
      .set('Authorization', admin)
      .set('Content-Type', 'application/json')
      .expect(204);
    expect(
      await prisma.clienteDireccion.findMany({ where: { direccionId } }),
    ).toEqual([
      {
        clienteId: vecina.cliente!.id,
        direccionId,
        etiqueta: 'Trabajo',
        esActual: false,
      },
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
    const guardado = await guardar()
      .send({
        ...entrada,
        puntos: [
          { ...origen, direccion: { ...origen.direccion, altura: 895 } },
          { ...destino, direccion: { ...destino.direccion, altura: 896 } },
        ],
      })
      .expect(201);
    const creado = guardado.body as TrayectoResponseDto;
    await api()
      .delete(`/api/trayectos/${creado.id}`)
      .set('Authorization', admin)
      .set('Content-Type', 'application/json')
      .expect(204);
    await leer(creado.id).expect(404);
    expect(
      await prisma.puntoTrayecto.count({ where: { trayectoId: creado.id } }),
    ).toBe(0);
    const ids = [
      ...new Set(creado.puntos.map(({ direccionId }) => direccionId)),
    ];
    expect(await prisma.direccion.count({ where: { id: { in: ids } } })).toBe(
      ids.length,
    );
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
