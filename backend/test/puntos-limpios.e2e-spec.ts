import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import type { App } from 'supertest/types';
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
  const record = { id: tipoId, ...body };
  const response = record;
  const db = {
    user: { findUnique: jest.fn() },
    puntoLimpio: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
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
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
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
    db.puntoLimpio.findMany.mockResolvedValue([record]);
    db.puntoLimpio.findUnique.mockResolvedValue(record);
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
      data: body,
      select: puntoLimpioSelect,
    });

    db.puntoLimpio.create.mockRejectedValue({ code: 'P2003' });
    await request(app.getHttpServer())
      .post('/puntos-limpios')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(body)
      .expect(400);
  });

  it('actualiza parcialmente y devuelve 404 si no existe', async () => {
    await request(app.getHttpServer())
      .patch(`/puntos-limpios/${tipoId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ lat: 0 })
      .expect(200)
      .expect(response);
    expect(db.puntoLimpio.update).toHaveBeenCalledWith({
      where: { id: tipoId },
      data: { lat: 0 },
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
