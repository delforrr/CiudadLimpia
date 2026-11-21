import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';
import { PrismaService } from '../src/prisma/prisma.service';
import { publicUserSelect } from '../src/user/user.select';
import { Prisma } from '../src/generated/prisma/client';

describe('User CRUD (HTTP)', () => {
  let app: INestApplication<App>;
  let adminToken: string;
  let userToken: string;
  const adminId = '00000000-0000-4000-8000-000000000001';
  const userId = '00000000-0000-4000-8000-000000000002';
  const missingId = '00000000-0000-4000-8000-000000000003';
  const direccionId = '00000000-0000-4000-8000-000000000004';
  const frente = {
    calle: 'San Martín',
    altura: 123,
    lat: -35.97,
    long: -62.73,
  };
  const direccion = {
    ...frente,
    id: direccionId,
    calle: { calle: frente.calle },
  };
  const domicilio = { direccion, etiqueta: null };
  const user = {
    id: userId,
    email: 'ana@example.com',
    role: 'USER',
    cliente: {
      id: 'cliente-1',
      name: 'Ana',
      lastName: 'Pérez',
      domicilios: [domicilio],
    },
  };
  const userResponse = {
    ...user,
    cliente: {
      ...user.cliente,
      domicilios: [
        {
          ...frente,
          id: direccionId,
          direccion: 'San Martín 123',
          etiqueta: null,
        },
      ],
    },
  };
  const db = {
    $transaction: jest.fn(),
    direccion: { findUnique: jest.fn() },
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
    configureApp(app);
    await app.init();
    adminToken = await app.get(JwtService).signAsync({ sub: adminId });
    userToken = await app.get(JwtService).signAsync({ sub: userId });
  });

  beforeEach(() => {
    jest.resetAllMocks();
    db.$transaction.mockImplementation(
      (operation: (tx: typeof db) => unknown) => operation(db),
    );
    db.direccion.findUnique.mockResolvedValue(direccion);
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

  it('creates an account with its role in the JSON body', async () => {
    await request(app.getHttpServer())
      .post('/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'new@example.com',
        password: 'password!2026',
        role: 'ADMIN',
        cliente: {
          name: 'Ana',
          lastName: 'Pérez',
          domicilios: [{ direccionId }],
        },
      })
      .expect(201);
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
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'new@example.com',
          password: 'password!2026',
          role: 'USER',
          cliente,
        })
        .expect(400);
      expect(db.user.create).not.toHaveBeenCalled();
    },
  );

  it.each(['', '?role=invalid', '?role=USER&role=ADMIN'])(
    'rejects the old query role without a JSON role: %s',
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
            domicilios: [{ direccionId }],
          },
        })
        .expect(400);
      expect(db.user.create).not.toHaveBeenCalled();
    },
  );

  it('creates an account with an atomic nested cliente, hashes passwords and handles duplicate emails', async () => {
    const dto = {
      role: 'USER',
      email: ' ANA@example.com ',
      password: 'password!2026',
      cliente: {
        name: ' Ana ',
        lastName: ' Pérez ',
        domicilios: [{ direccionId }],
      },
    };
    await request(app.getHttpServer())
      .post('/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(dto)
      .expect(201)
      .expect(userResponse);
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
            domicilios: { create: [{ direccionId }] },
          },
        },
      },
      select: publicUserSelect,
    });
    expect(
      await bcrypt.compare(dto.password, calls[0][0].data.passwordHash),
    ).toBe(true);
    db.user.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Duplicate email', {
        code: 'P2002',
        clientVersion: '7.10.1',
      }),
    );
    await request(app.getHttpServer())
      .post('/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(dto)
      .expect(409);
  });

  it.each(['USER', 'ADMIN'])(
    'creates the role requested in the JSON body: %s',
    async (role) => {
      const body = {
        role,
        email: 'new@example.com',
        password: 'password!2026',
        cliente: {
          name: 'Ana',
          lastName: 'Pérez',
          domicilios: [{ direccionId }],
        },
      };
      await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(body)
        .expect(201);
      const calls = db.user.create.mock.calls as [{ data: { role: string } }][];
      expect(calls[0][0].data.role).toBe(role);
      db.user.create.mockClear();
      await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...body, role: 'invalid' })
        .expect(400);
      expect(db.user.create).not.toHaveBeenCalled();
    },
  );

  it.each([
    { passwordHash: 'injected' },
    { role: null },
    { role: [] },
    {
      cliente: {
        name: 'Ana',
        lastName: 'Pérez',
        domicilios: [{ direccion: 'Casa', userId: adminId }],
      },
    },
  ])('rejects invalid creation fields before writing: %j', async (change) => {
    await request(app.getHttpServer())
      .post('/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'new@example.com',
        password: 'password!2026',
        role: 'USER',
        cliente: {
          name: 'Ana',
          lastName: 'Pérez',
          domicilios: [{ direccionId }],
        },
        ...change,
      })
      .expect(400);
    expect(db.user.create).not.toHaveBeenCalled();
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
      .expect([userResponse]);
    await request(app.getHttpServer())
      .post('/users')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        email: 'other@example.com',
        password: 'password!2026',
        cliente: {
          name: 'Ana',
          lastName: 'Pérez',
          domicilios: [{ direccionId }],
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
      .expect(userResponse);
    await request(app.getHttpServer())
      .get(`/users/${userId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
      .expect(userResponse);
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

  it('uses the current database role instead of a role claimed in the JWT', async () => {
    const token = await app.get(JwtService).signAsync({
      sub: userId,
      role: 'ADMIN',
    });
    await request(app.getHttpServer())
      .get('/users')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
    db.user.findUnique.mockResolvedValue({ id: userId, role: 'ADMIN' });
    await request(app.getHttpServer())
      .get('/users')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(db.user.findUnique).toHaveBeenLastCalledWith({
      where: { id: userId },
      select: { id: true, role: true },
    });
    db.user.findUnique.mockResolvedValue(user);
    await request(app.getHttpServer())
      .get('/users')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
    db.user.findUnique.mockResolvedValue(null);
    await request(app.getHttpServer())
      .get(`/users/${userId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(401);
    expect(db.user.findMany).toHaveBeenCalledTimes(1);
  });

  it.each(['USER', 'ADMIN', null, 'invalid'])(
    'rejects any role field from a non-admin before updating: %j',
    async (role) => {
      await request(app.getHttpServer())
        .patch(`/users/${userId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ role })
        .expect(403);
      expect(db.user.update).not.toHaveBeenCalled();
    },
  );

  it.each([null, 'invalid'])(
    'validates the role field for admins: %j',
    async (role) => {
      await request(app.getHttpServer())
        .patch(`/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role })
        .expect(400);
      expect(db.user.update).not.toHaveBeenCalled();
    },
  );

  it.each([undefined, null, '', ' Casa '])(
    'saves and returns an optional address label: %j',
    async (etiqueta) => {
      const domicilios = [{ direccionId, etiqueta }];
      const saved = {
        ...user,
        cliente: {
          ...user.cliente,
          domicilios: [{ ...domicilio, etiqueta: etiqueta?.trim() ?? null }],
        },
      };
      db.user.update.mockResolvedValue(saved);
      await request(app.getHttpServer())
        .patch(`/users/${userId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ cliente: { name: 'Ana', lastName: 'Pérez', domicilios } })
        .expect(200)
        .expect({
          ...userResponse,
          cliente: {
            ...userResponse.cliente,
            domicilios: [
              {
                ...userResponse.cliente.domicilios[0],
                etiqueta: etiqueta?.trim() ?? null,
              },
            ],
          },
        });
      const normalized = [
        {
          direccionId,
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
            domicilios: [{ direccionId, etiqueta }],
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
          upsert: { create: cliente, update: cliente },
        },
      },
      select: publicUserSelect,
    });
    await request(app.getHttpServer())
      .patch(endpoint)
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        cliente: { ...cliente, domicilios: [{ direccionId }] },
      })
      .expect(200);
    expect(db.user.update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: {
          cliente: {
            upsert: {
              create: {
                ...cliente,
                domicilios: { create: [{ direccionId }] },
              },
              update: {
                ...cliente,
                domicilios: {
                  deleteMany: {},
                  create: [{ direccionId }],
                },
              },
            },
          },
        },
      }),
    );
    db.user.update.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Duplicate email', {
        code: 'P2002',
        clientVersion: '7.10.1',
      }),
    );
    await request(app.getHttpServer())
      .patch(endpoint)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ email: 'taken@example.com' })
      .expect(409);
    db.user.update.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Missing user', {
        code: 'P2025',
        clientVersion: '7.10.1',
      }),
    );
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
      .expect(userResponse);
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

  it('permite dejar la lista vacía y devuelve 400 si se repite la dirección', async () => {
    const patch = () =>
      request(app.getHttpServer())
        .patch(`/users/${userId}`)
        .set('Authorization', `Bearer ${userToken}`);
    const cliente = { name: 'Ana', lastName: 'Pérez' };
    await patch()
      .send({
        cliente: { ...cliente, domicilios: [{ direccionId }, { direccionId }] },
      })
      .expect(400);
    expect(db.user.update).not.toHaveBeenCalled();
    await patch()
      .send({ cliente: { ...cliente, domicilios: [] } })
      .expect(200);
    expect(db.user.update).toHaveBeenCalledWith(
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
  });

  it.each([
    { email: null },
    { password: 'short' },
    { password: 'á'.repeat(37) },
    { passwordHash: 'untrusted' },
    { cliente: null },
    { cliente: [] },
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
    db.user.delete.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Missing user', {
        code: 'P2025',
        clientVersion: '7.10.1',
      }),
    );
    await request(app.getHttpServer())
      .delete(`/users/${userId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('Content-Type', 'application/json')
      .expect(404);
  });
});
