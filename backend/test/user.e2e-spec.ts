import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { publicUserSelect } from '../src/user/user.select';

describe('User CRUD (HTTP)', () => {
  let app: INestApplication<App>;
  let adminToken: string;
  let userToken: string;
  const adminId = '00000000-0000-4000-8000-000000000001';
  const userId = '00000000-0000-4000-8000-000000000002';
  const missingId = '00000000-0000-4000-8000-000000000003';
  const user = {
    id: userId,
    email: 'ana@example.com',
    role: 'USER',
    cliente: null,
  };
  const db = {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
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
            ? user
            : null,
    );
    db.user.findMany.mockResolvedValue([user]);
    db.user.create.mockResolvedValue(user);
    db.user.update.mockResolvedValue(user);
    db.user.delete.mockResolvedValue(user);
  });
  afterAll(async () => {
    await app.close();
  });

  it('creates an account with an atomic nested cliente, hashes passwords and handles duplicate emails', async () => {
    const dto = {
      email: ' ANA@example.com ',
      password: 'password!2026',
      cliente: {
        name: ' Ana ',
        lastName: ' Pérez ',
        domicilios: [{ direccion: ' San Martín 123 ' }],
      },
    };
    await request(app.getHttpServer())
      .post('/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(dto)
      .expect(201)
      .expect(user);
    const calls = db.user.create.mock.calls as [
      { data: { passwordHash: string } },
    ][];
    const hash = calls[0][0].data.passwordHash;
    expect(bcrypt.getRounds(hash)).toBe(12);
    expect(db.user.create).toHaveBeenCalledWith({
      data: {
        email: 'ana@example.com',
        passwordHash: hash,
        cliente: {
          create: {
            name: 'Ana',
            lastName: 'Pérez',
            domicilios: { create: [{ direccion: 'San Martín 123' }] },
          },
        },
      },
      select: publicUserSelect,
    });
    expect(
      await bcrypt.compare(dto.password, calls[0][0].data.passwordHash),
    ).toBe(true);
    db.user.create.mockRejectedValue({ code: 'P2002' });
    await request(app.getHttpServer())
      .post('/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(dto)
      .expect(409);
  });

  it('requires admin for listing, creating, deleting and changing roles', async () => {
    await request(app.getHttpServer()).get('/users').expect(401);
    await request(app.getHttpServer())
      .get('/users')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403);
    await request(app.getHttpServer())
      .get('/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
      .expect([user]);
    await request(app.getHttpServer())
      .post('/users')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ email: 'other@example.com', password: 'password!2026' })
      .expect(403);
    await request(app.getHttpServer())
      .delete(`/users/${userId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .set('Content-Type', 'application/json')
      .expect(403);
    await request(app.getHttpServer())
      .patch(`/users/${userId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ role: 'ADMIN' })
      .expect(403);
    expect(db.user.create).not.toHaveBeenCalled();
    expect(db.user.delete).not.toHaveBeenCalled();
    expect(db.user.update).not.toHaveBeenCalled();
    await request(app.getHttpServer())
      .patch(`/users/${userId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'ADMIN' })
      .expect(200);
  });

  it('allows self access, denies other accounts, and validates identifiers', async () => {
    await request(app.getHttpServer())
      .get(`/users/${userId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200)
      .expect(user);
    await request(app.getHttpServer())
      .get(`/users/${adminId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403);
    await request(app.getHttpServer())
      .patch(`/users/${adminId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ email: 'taken@example.com' })
      .expect(403);
    await request(app.getHttpServer())
      .get('/users/invalid')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);
    await request(app.getHttpServer())
      .get(`/users/${missingId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
    const deleted = await app.get(JwtService).signAsync({ sub: missingId });
    await request(app.getHttpServer())
      .get('/users')
      .set('Authorization', `Bearer ${deleted}`)
      .expect(401);
  });

  it('updates the profile atomically and preserves addresses unless explicitly replaced', async () => {
    const endpoint = `/users/${userId}`;
    const cliente = { name: 'Ana', lastName: 'Gómez' };
    await request(app.getHttpServer())
      .patch(endpoint)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ cliente })
      .expect(200);
    expect(db.user.update).toHaveBeenLastCalledWith({
      where: { id: userId },
      data: {
        cliente: {
          upsert: {
            create: { ...cliente, domicilios: { create: [] } },
            update: cliente,
          },
        },
      },
      select: publicUserSelect,
    });
    await request(app.getHttpServer())
      .patch(endpoint)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ cliente: { ...cliente, domicilios: [] } })
      .expect(200);
    expect(db.user.update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: {
          cliente: {
            upsert: {
              create: { ...cliente, domicilios: { create: [] } },
              update: {
                ...cliente,
                domicilios: { deleteMany: {}, create: [] },
              },
            },
          },
        },
      }),
    );
    db.user.update.mockRejectedValue({ code: 'P2002' });
    await request(app.getHttpServer())
      .patch(endpoint)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ email: 'taken@example.com' })
      .expect(409);
    db.user.update.mockRejectedValue({ code: 'P2025' });
    await request(app.getHttpServer())
      .patch(`/users/${missingId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email: 'missing@example.com' })
      .expect(404);
  });

  it.each([
    { email: null },
    { password: 'short' },
    { password: 'á'.repeat(37) },
    { passwordHash: 'untrusted' },
    { role: 'invalid' },
    { role: null },
    { cliente: null },
    { cliente: {} },
    { cliente: { name: ' ', lastName: 'Pérez' } },
    {
      cliente: {
        name: 'Ana',
        lastName: 'Pérez',
        domicilios: [{ direccion: ' ' }],
      },
    },
    { cliente: { name: 'Ana', lastName: 'Pérez', domicilios: null } },
    { cliente: { name: 'Ana', lastName: 'Pérez', userId: adminId } },
  ])('rejects invalid update %j before writing', async (body) => {
    await request(app.getHttpServer())
      .patch(`/users/${userId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .send(body)
      .expect(400);
    expect(db.user.update).not.toHaveBeenCalled();
  });

  it('protects mutations from cross-site requests and non-JSON bodies', async () => {
    await request(app.getHttpServer())
      .patch(`/users/${userId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .set('Sec-Fetch-Site', 'cross-site')
      .send({ email: 'other@example.com' })
      .expect(403);
    await request(app.getHttpServer())
      .patch(`/users/${userId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .type('form')
      .send({ email: 'other@example.com' })
      .expect(415);
    expect(db.user.update).not.toHaveBeenCalled();
  });

  it('deletes an account and returns 404 when it is already absent', async () => {
    await request(app.getHttpServer())
      .delete(`/users/${userId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('Content-Type', 'application/json')
      .expect(204);
    expect(db.user.delete).toHaveBeenCalledWith({ where: { id: userId } });
    db.user.delete.mockRejectedValue({ code: 'P2025' });
    await request(app.getHttpServer())
      .delete(`/users/${userId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('Content-Type', 'application/json')
      .expect(404);
  });
});
