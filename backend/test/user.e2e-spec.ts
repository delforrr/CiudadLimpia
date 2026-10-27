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
    cliente: {
      id: 'cliente-1',
      name: 'Ana',
      lastName: 'Pérez',
      domicilios: [{ id: 'domicilio-1', direccion: 'San Martín 123' }],
    },
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

  it.each([
    undefined,
    null,
    [],
    'invalid',
    {},
    { name: 'Ana', lastName: 'Pérez' },
    { name: 'Ana', lastName: 'Pérez', domicilios: [] },
  ])(
    'requires a cliente with at least one address on creation: %j',
    async (cliente) => {
      await request(app.getHttpServer())
        .post('/users?role=USER')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'new@example.com', password: 'password!2026', cliente })
        .expect(400);
      expect(db.user.create).not.toHaveBeenCalled();
    },
  );

  it.each(['', '?role=invalid', '?role=USER&role=ADMIN'])(
    'requires a single valid role query parameter: %s',
    async (query) => {
      await request(app.getHttpServer())
        .post(`/users${query}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'new@example.com',
          password: 'password!2026',
          cliente: {
            name: 'Ana',
            lastName: 'Pérez',
            domicilios: [{ direccion: 'San Martín 123' }],
          },
        })
        .expect(400);
      expect(db.user.create).not.toHaveBeenCalled();
    },
  );

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
      .post('/users?role=USER')
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
        role: 'USER',
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
      .post('/users?role=USER')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(dto)
      .expect(409);
  });

  it.each(['USER', 'ADMIN'])(
    'creates the role requested in the query: %s',
    async (role) => {
      const body = {
        email: 'new@example.com',
        password: 'password!2026',
        cliente: {
          name: 'Ana',
          lastName: 'Pérez',
          domicilios: [{ direccion: 'San Martín 123' }],
        },
      };
      await request(app.getHttpServer())
        .post(`/users?role=${role}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(body)
        .expect(201);
      const calls = db.user.create.mock.calls as [{ data: { role: string } }][];
      expect(calls[0][0].data.role).toBe(role);
      db.user.create.mockClear();
      await request(app.getHttpServer())
        .post(`/users?role=${role}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...body, role: 'ADMIN' })
        .expect(400);
      expect(db.user.create).not.toHaveBeenCalled();
    },
  );

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
      .post('/users?role=USER')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        email: 'other@example.com',
        password: 'password!2026',
        cliente: {
          name: 'Ana',
          lastName: 'Pérez',
          domicilios: [{ direccion: 'San Martín 123' }],
        },
      })
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

  it.each([undefined, null, '', ' Casa '])(
    'saves and returns an optional address label: %j',
    async (etiqueta) => {
      const domicilios = [{ direccion: 'San Martín 123', etiqueta }];
      const saved = {
        ...user,
        cliente: {
          ...user.cliente,
          domicilios: [
            {
              id: 'domicilio-1',
              direccion: 'San Martín 123',
              etiqueta: etiqueta?.trim() ?? null,
            },
          ],
        },
      };
      db.user.update.mockResolvedValue(saved);
      await request(app.getHttpServer())
        .patch(`/users/${userId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ cliente: { name: 'Ana', lastName: 'Pérez', domicilios } })
        .expect(200)
        .expect(saved);
      const normalized = [
        {
          direccion: 'San Martín 123',
          ...(etiqueta !== undefined
            ? { etiqueta: etiqueta?.trim() ?? null }
            : {}),
        },
      ];
      const profile = { name: 'Ana', lastName: 'Pérez' };
      expect(db.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: {
          cliente: {
            upsert: {
              create: { ...profile, domicilios: { create: normalized } },
              update: {
                ...profile,
                domicilios: { deleteMany: {}, create: normalized },
              },
            },
          },
        },
        select: publicUserSelect,
      });
      expect(publicUserSelect.cliente.select.domicilios.select.etiqueta).toBe(
        true,
      );
    },
  );

  it.each([123, {}, [], 'x'.repeat(101)])(
    'rejects an invalid address label: %j',
    async (etiqueta) => {
      await request(app.getHttpServer())
        .patch(`/users/${userId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          cliente: {
            name: 'Ana',
            lastName: 'Pérez',
            domicilios: [{ direccion: 'San Martín 123', etiqueta }],
          },
        })
        .expect(400);
      expect(db.user.update).not.toHaveBeenCalled();
    },
  );

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
          update: cliente,
        },
      },
      select: publicUserSelect,
    });
    await request(app.getHttpServer())
      .patch(endpoint)
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        cliente: { ...cliente, domicilios: [{ direccion: 'Belgrano 456' }] },
      })
      .expect(200);
    expect(db.user.update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: {
          cliente: {
            upsert: {
              create: {
                ...cliente,
                domicilios: { create: [{ direccion: 'Belgrano 456' }] },
              },
              update: {
                ...cliente,
                domicilios: {
                  deleteMany: {},
                  create: [{ direccion: 'Belgrano 456' }],
                },
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

  it('hashes an updated password without changing the profile or exposing the hash', async () => {
    const password = ' nueva contraseña!2026 ';
    await request(app.getHttpServer())
      .patch(`/users/${userId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ password })
      .expect(200)
      .expect(user);
    const calls = db.user.update.mock.calls as [
      { data: { passwordHash: string } },
    ][];
    const hash = calls[0][0].data.passwordHash;
    expect(bcrypt.getRounds(hash)).toBe(12);
    expect(await bcrypt.compare(password, hash)).toBe(true);
    expect(await bcrypt.compare(password.trim(), hash)).toBe(false);
    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: userId },
      data: { passwordHash: hash },
      select: publicUserSelect,
    });
  });

  it.each([null, { name: 'Ana', lastName: 'Pérez', domicilios: [] }])(
    'requires an address before updating an incomplete account: %j',
    async (cliente) => {
      db.user.findUnique.mockResolvedValue({ ...user, cliente });
      for (const body of [
        { email: 'new@example.com' },
        { cliente: { name: 'Ana', lastName: 'Pérez' } },
      ]) {
        const response = await request(app.getHttpServer())
          .patch(`/users/${userId}`)
          .set('Authorization', `Bearer ${userToken}`)
          .send(body)
          .expect(400);
        expect((response.body as { message: string }).message).toBe(
          'Completá al menos un domicilio para guardar tus datos',
        );
      }
      expect(db.user.update).not.toHaveBeenCalled();
      await request(app.getHttpServer())
        .patch(`/users/${userId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          cliente: {
            name: 'Ana',
            lastName: 'Pérez',
            domicilios: [{ direccion: 'San Martín 123' }],
          },
        })
        .expect(200);
      expect(db.user.update).toHaveBeenCalledTimes(1);
    },
  );

  it.each([
    { email: null },
    { password: 'short' },
    { password: 'á'.repeat(37) },
    { passwordHash: 'untrusted' },
    { role: 'invalid' },
    { role: null },
    { cliente: null },
    { cliente: [] },
    { cliente: { name: 'Ana', lastName: 'Pérez', domicilios: [] } },
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
