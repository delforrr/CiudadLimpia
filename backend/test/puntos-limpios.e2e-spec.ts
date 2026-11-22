import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import type { App } from 'supertest/types';
import { configureApp } from '../src/configure-app';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { puntoLimpioSelect } from '../src/punto-limpio/puntos-limpios.select';

describe('PuntosLimpios CRUD (HTTP)', () => {
  let app: INestApplication<App>;
  let adminToken: string;
  let userToken: string;
  const adminId = '00000000-0000-4000-8000-000000000001';
  const userId = '00000000-0000-4000-8000-000000000002';
  const tipoId = '00000000-0000-4000-8000-000000000003';
  const residuoId = '00000000-0000-4000-8000-000000000004';
  const missingId = '00000000-0000-4000-8000-000000000005';
  const body = {
    nombre: 'Parque Villegas',
    tipoId,
    direccionId: residuoId,
    lat: -35.97,
    long: -62.73,
  };
  const { lat, long, ...puntoData } = body;
  const pin = { lat, long };
  const frente = { calle: 'Roca', altura: 50, ...pin };
  const direccionResponse = { ...frente, id: residuoId, direccion: 'Roca 50' };
  const direccionRecord = {
    ...frente,
    id: residuoId,
    calle: { calle: 'Roca' },
  };
  const record = { id: tipoId, ...puntoData, direccion: pin };
  const response = { id: tipoId, ...body };
  const db = {
    user: { findUnique: jest.fn() },
    $transaction: jest.fn(),
    calle: { upsert: jest.fn() },
    $queryRaw: jest.fn(),
    direccion: {
      findUnique: jest.fn(),
      createMany: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    puntoLimpio: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeAll(async () => {
    process.env.JWT_SECRET = 'test-only-secret-at-least-32-characters';
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(db)
      .compile();
    app = module.createNestApplication();
    configureApp(app);
    await app.init();
    adminToken = await app.get(JwtService).signAsync({ sub: adminId });
    userToken = await app.get(JwtService).signAsync({ sub: userId });
  });

  beforeEach(() => {
    jest.resetAllMocks();
    db.user.findUnique.mockImplementation(
      ({ where }: { where: { id: string } }) =>
        where.id === adminId
          ? { id: adminId, role: 'ADMIN' }
          : where.id === userId
            ? { id: userId, role: 'USER' }
            : null,
    );
    db.$transaction.mockImplementation(
      (operation: (tx: typeof db) => unknown) => operation(db),
    );
    db.calle.upsert.mockResolvedValue({ id: missingId, calle: 'Roca' });
    db.direccion.findUnique.mockResolvedValue(direccionRecord);
    db.direccion.findUniqueOrThrow.mockResolvedValue(direccionRecord);
    db.puntoLimpio.findMany.mockResolvedValue([record]);
    db.puntoLimpio.findUnique.mockResolvedValue(record);
    db.puntoLimpio.findUniqueOrThrow.mockResolvedValue(record);
    db.puntoLimpio.create.mockResolvedValue(record);
    db.puntoLimpio.update.mockResolvedValue(record);
    db.puntoLimpio.delete.mockResolvedValue(record);
  });

  afterAll(async () => {
    await app.close();
  });

  it('lista y consulta puntos públicamente', async () => {
    await request(app.getHttpServer())
      .get('/puntos-limpios')
      .expect(200)
      .expect([response]);
    expect(db.puntoLimpio.findMany).toHaveBeenCalledWith({
      select: puntoLimpioSelect,
      orderBy: { nombre: 'asc' },
    });

    await request(app.getHttpServer())
      .get(`/puntos-limpios/${tipoId}`)
      .expect(200)
      .expect(response);

    db.puntoLimpio.findUnique.mockResolvedValueOnce(null);
    await request(app.getHttpServer())
      .get(`/puntos-limpios/${missingId}`)
      .expect(404);
    await request(app.getHttpServer())
      .get('/puntos-limpios/invalid')
      .expect(400);
  });

  it('requires an admin session to create, edit and delete', async () => {
    await request(app.getHttpServer())
      .post('/puntos-limpios')
      .send(body)
      .expect(401);
    await request(app.getHttpServer())
      .post('/puntos-limpios')
      .set('Authorization', `Bearer ${userToken}`)
      .send(body)
      .expect(403);
    await request(app.getHttpServer())
      .patch(`/puntos-limpios/${tipoId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .send(body)
      .expect(403);
    await request(app.getHttpServer())
      .delete(`/puntos-limpios/${tipoId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .set('Content-Type', 'application/json')
      .expect(403);
    expect(db.puntoLimpio.create).not.toHaveBeenCalled();
    expect(db.puntoLimpio.update).not.toHaveBeenCalled();
    expect(db.puntoLimpio.delete).not.toHaveBeenCalled();
  });

  it('crea un punto y valida el cuerpo y las referencias', async () => {
    await request(app.getHttpServer())
      .post('/puntos-limpios')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ...body, lat: 91 })
      .expect(400);
    expect(db.puntoLimpio.create).not.toHaveBeenCalled();

    await request(app.getHttpServer())
      .post('/puntos-limpios')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(body)
      .expect(201)
      .expect(response);
    expect(db.puntoLimpio.create).toHaveBeenCalledWith({
      data: puntoData,
      select: puntoLimpioSelect,
    });

    db.puntoLimpio.create.mockRejectedValue({ code: 'P2003' });
    await request(app.getHttpServer())
      .post('/puntos-limpios')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(body)
      .expect(409)
      .expect({
        statusCode: 409,
        message: 'Conflicto de integridad referencial en la base de datos',
        error: 'Conflict',
      });
  });

  it('registra la direccion junto con el punto y rechaza dos opciones o una altura invalida', async () => {
    const { direccionId, ...punto } = body;
    const direccion = { calle: '  Roca  ', altura: 50 };
    const alta = () =>
      request(app.getHttpServer())
        .post('/puntos-limpios')
        .set('Authorization', `Bearer ${adminToken}`);

    await alta()
      .send({ ...punto, direccionId, direccion })
      .expect(400);
    await alta()
      .send({ ...punto, direccion: { ...direccion, altura: 0 } })
      .expect(400);
    expect(db.$transaction).not.toHaveBeenCalled();

    await alta()
      .send({ ...punto, direccion })
      .expect(201)
      .expect(response);
    expect(db.$transaction).toHaveBeenCalledTimes(1);
    expect(db.calle.upsert).toHaveBeenCalledWith({
      where: { clave: 'roca' },
      create: { clave: 'roca', calle: 'Roca' },
      update: { clave: 'roca' },
      select: { id: true },
    });
    expect(db.direccion.createMany).toHaveBeenCalledWith({
      data: { calleId: missingId, altura: 50, ...pin },
      skipDuplicates: true,
    });
    expect(db.puntoLimpio.create).toHaveBeenCalledWith({
      data: puntoData,
      select: puntoLimpioSelect,
    });

    db.direccion.findUnique.mockResolvedValueOnce(null);
    await alta().send(body).expect(400);
    expect(db.direccion.findUnique).toHaveBeenCalledWith({
      where: { id: direccionId },
      select: expect.any(Object) as object,
    });
    await alta()
      .send({ ...body, lat: 0 })
      .expect(409)
      .expect({
        statusCode: 409,
        code: 'PIN_DIRECCION_DISTINTO',
        message: 'El pin enviado difiere del pin guardado para esta dirección',
        direccion: direccionResponse,
      });
    await alta().send(puntoData).expect(201).expect(response);
  });

  it('lista el catálogo compartido y limita la corrección del pin al administrador', async () => {
    const catalogo = () => request(app.getHttpServer());
    const auth = `Bearer ${adminToken}`;
    const ruta = `/direcciones/${body.direccionId}`;
    db.$queryRaw.mockResolvedValue([direccionResponse]);
    db.direccion.create.mockResolvedValue(direccionRecord);
    db.direccion.update.mockResolvedValue({ ...direccionRecord, lat: 0 });

    for (const path of [
      '/direcciones',
      '/direcciones/puntos-limpios?buscar=roca',
    ]) {
      await catalogo().get(path).expect(401);
      await catalogo()
        .get(path)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
      await catalogo()
        .get(path)
        .set('Authorization', auth)
        .expect(200)
        .expect([direccionResponse]);
    }
    await catalogo()
      .get(ruta)
      .set('Authorization', auth)
      .expect(200)
      .expect(direccionResponse);
    await catalogo()
      .post('/direcciones')
      .set('Authorization', auth)
      .send({ ...frente, altura: undefined })
      .expect(400);
    await catalogo()
      .post('/direcciones')
      .set('Authorization', auth)
      .send(frente)
      .expect(201)
      .expect(direccionResponse);
    await catalogo()
      .patch(ruta)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ ...pin, lat: 0 })
      .expect(403);
    await catalogo()
      .patch(ruta)
      .set('Authorization', auth)
      .send({ altura: 52, ...pin })
      .expect(400);
    await catalogo()
      .patch(ruta)
      .set('Authorization', auth)
      .send({ ...pin, lat: 0 })
      .expect(200)
      .expect({ ...direccionResponse, lat: 0 });
    await catalogo()
      .delete(ruta)
      .set('Authorization', auth)
      .set('Content-Type', 'application/json')
      .expect(204);
    expect(db.direccion.delete).toHaveBeenCalledWith({
      where: { id: body.direccionId },
    });
  });

  it('actualiza parcialmente y devuelve 404 si no existe', async () => {
    const patch = () =>
      request(app.getHttpServer())
        .patch(`/puntos-limpios/${tipoId}`)
        .set('Authorization', `Bearer ${adminToken}`);
    await patch().send({ lat: 0 }).expect(400);
    await patch().send({ lat: 0, long }).expect(409);
    await patch().send({ direccionId: residuoId, lat: 0, long }).expect(409);
    expect(db.puntoLimpio.update).not.toHaveBeenCalled();
    await patch()
      .send({ nombre: body.nombre, ...pin })
      .expect(200)
      .expect(response);
    expect(db.puntoLimpio.update).toHaveBeenCalledWith({
      where: { id: tipoId },
      data: { nombre: body.nombre },
      select: puntoLimpioSelect,
    });
    db.puntoLimpio.update.mockRejectedValue({ code: 'P2025' });
    await request(app.getHttpServer())
      .patch(`/puntos-limpios/${missingId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ nombre: 'Nuevo nombre' })
      .expect(404);
  });

  it('elimina únicamente el punto y devuelve 404 si no existe', async () => {
    await request(app.getHttpServer())
      .delete(`/puntos-limpios/${tipoId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('Content-Type', 'application/json')
      .expect(204);
    expect(db.puntoLimpio.delete).toHaveBeenCalledWith({
      where: { id: tipoId },
    });
    db.puntoLimpio.delete.mockRejectedValue({ code: 'P2025' });
    await request(app.getHttpServer())
      .delete(`/puntos-limpios/${missingId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('Content-Type', 'application/json')
      .expect(404);
  });

  it('requiere JSON y valida UUID y null en las escrituras', async () => {
    await request(app.getHttpServer())
      .delete(`/puntos-limpios/${tipoId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(415);
    await request(app.getHttpServer())
      .patch('/puntos-limpios/invalid')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ nombre: 'Nuevo' })
      .expect(400);
    await request(app.getHttpServer())
      .patch(`/puntos-limpios/${tipoId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ lat: null })
      .expect(400);
    expect(db.puntoLimpio.update).not.toHaveBeenCalled();
    expect(db.puntoLimpio.delete).not.toHaveBeenCalled();
  });
});
