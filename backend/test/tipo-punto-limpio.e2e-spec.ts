import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { tipoPuntoLimpioSelect } from '../src/tipo-punto-limpio/tipo-punto-limpio.select';

describe('TipoPuntoLimpio CRUD (HTTP)', () => {
  let app: INestApplication<App>;
  let adminToken: string;
  let userToken: string;
  const adminId = '00000000-0000-4000-8000-000000000001';
  const userId = '00000000-0000-4000-8000-000000000002';
  const tipoId = '00000000-0000-4000-8000-000000000003';
  const residuoId = '00000000-0000-4000-8000-000000000004';
  const missingId = '00000000-0000-4000-8000-000000000005';
  const record = {
    id: tipoId,
    nombre: 'Botellero',
    residuos: [{ residuo: { id: residuoId, nombre: 'Botellas' } }],
  };
  const response = {
    id: tipoId,
    nombre: 'Botellero',
    residuos: [{ id: residuoId, nombre: 'Botellas' }],
  };
  const db = {
    user: { findUnique: jest.fn() },
    tipoPuntoLimpio: {
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
    db.tipoPuntoLimpio.findMany.mockResolvedValue([record]);
    db.tipoPuntoLimpio.findUnique.mockResolvedValue(record);
    db.tipoPuntoLimpio.create.mockResolvedValue(record);
    db.tipoPuntoLimpio.update.mockResolvedValue(record);
    db.tipoPuntoLimpio.delete.mockResolvedValue(record);
  });

  afterAll(async () => {
    await app.close();
  });

  it('lists and reads tipos publicly', async () => {
    await request(app.getHttpServer())
      .get('/tipos-punto-limpio')
      .expect(200)
      .expect([response]);
    expect(db.tipoPuntoLimpio.findMany).toHaveBeenCalledWith({
      select: tipoPuntoLimpioSelect,
      orderBy: { nombre: 'asc' },
    });

    await request(app.getHttpServer())
      .get(`/tipos-punto-limpio/${tipoId}`)
      .expect(200)
      .expect(response);

    db.tipoPuntoLimpio.findUnique.mockResolvedValueOnce(null);
    await request(app.getHttpServer())
      .get(`/tipos-punto-limpio/${missingId}`)
      .expect(404);
    await request(app.getHttpServer())
      .get('/tipos-punto-limpio/invalid')
      .expect(400);
  });

  it('requires an admin session to create, edit and delete', async () => {
    const body = { nombre: 'Botellero', residuos: [residuoId] };
    await request(app.getHttpServer())
      .post('/tipos-punto-limpio')
      .send(body)
      .expect(401);
    await request(app.getHttpServer())
      .post('/tipos-punto-limpio')
      .set('Authorization', `Bearer ${userToken}`)
      .send(body)
      .expect(403);
    await request(app.getHttpServer())
      .patch(`/tipos-punto-limpio/${tipoId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .send(body)
      .expect(403);
    await request(app.getHttpServer())
      .delete(`/tipos-punto-limpio/${tipoId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .set('Content-Type', 'application/json')
      .expect(403);
    expect(db.tipoPuntoLimpio.create).not.toHaveBeenCalled();
    expect(db.tipoPuntoLimpio.update).not.toHaveBeenCalled();
    expect(db.tipoPuntoLimpio.delete).not.toHaveBeenCalled();
  });

  it('creates a tipo with residuos and validates the body', async () => {
    await request(app.getHttpServer())
      .post('/tipos-punto-limpio')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ nombre: '', residuos: ['not-a-uuid'] })
      .expect(400);
    await request(app.getHttpServer())
      .post('/tipos-punto-limpio')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ nombre: 'Botellero', residuos: [residuoId, residuoId] })
      .expect(400);
    expect(db.tipoPuntoLimpio.create).not.toHaveBeenCalled();

    await request(app.getHttpServer())
      .post('/tipos-punto-limpio')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ nombre: ' Botellero ', residuos: [residuoId] })
      .expect(201)
      .expect(response);
    expect(db.tipoPuntoLimpio.create).toHaveBeenCalledWith({
      data: {
        nombre: 'Botellero',
        residuos: { create: [{ residuoId }] },
      },
      select: tipoPuntoLimpioSelect,
    });

    db.tipoPuntoLimpio.create.mockRejectedValue({ code: 'P2002' });
    await request(app.getHttpServer())
      .post('/tipos-punto-limpio')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ nombre: 'Botellero' })
      .expect(409);
  });

  it('replaces residuos on update and handles missing records', async () => {
    await request(app.getHttpServer())
      .patch(`/tipos-punto-limpio/${tipoId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ residuos: [residuoId] })
      .expect(200)
      .expect(response);
    expect(db.tipoPuntoLimpio.update).toHaveBeenCalledWith({
      where: { id: tipoId },
      data: {
        residuos: {
          deleteMany: {},
          create: [{ residuoId }],
        },
      },
      select: tipoPuntoLimpioSelect,
    });

    db.tipoPuntoLimpio.update.mockRejectedValue({ code: 'P2025' });
    await request(app.getHttpServer())
      .patch(`/tipos-punto-limpio/${missingId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ nombre: 'Botellero' })
      .expect(404);
  });

  it('deletes a tipo and reports conflicts when it is in use', async () => {
    await request(app.getHttpServer())
      .delete(`/tipos-punto-limpio/${tipoId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('Content-Type', 'application/json')
      .expect(204);
    expect(db.tipoPuntoLimpio.delete).toHaveBeenCalledWith({
      where: { id: tipoId },
    });

    db.tipoPuntoLimpio.delete.mockRejectedValue({ code: 'P2003' });
    await request(app.getHttpServer())
      .delete(`/tipos-punto-limpio/${tipoId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('Content-Type', 'application/json')
      .expect(409);
  });
});
