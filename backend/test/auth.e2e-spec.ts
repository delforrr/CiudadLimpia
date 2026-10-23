import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import type { Prisma } from '../src/generated/prisma/client';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Email/password authentication (HTTP)', () => {
  let app: INestApplication<App>;
  type User = Prisma.UserGetPayload<{
    include: { cliente: { include: { domicilios: true } } };
  }>;
  const users = new Map<string, User>();
  const account = {
    email: ' ANA@Example.com ',
    name: 'Ana María',
    lastName: 'Pérez',
    domicilios: [{ direccion: ' San Martín 123 ' }],
    password: ' pass!word á ',
    repeatedPassword: ' pass!word á ',
  };

  beforeAll(async () => {
    process.env.JWT_SECRET = 'test-only-secret-at-least-32-characters';
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue({
        user: {
          create: ({
            data,
          }: {
            data: {
              email: string;
              passwordHash: string;
              cliente: {
                create: {
                  name: string;
                  lastName: string;
                  domicilios: { create: { direccion: string }[] };
                };
              };
            };
          }) => {
            if (users.has(data.email))
              throw Object.assign(new Error('Duplicate email'), {
                code: 'P2002',
              });
            const user: User = {
              id: 'user-1',
              role: 'USER',
              email: data.email,
              passwordHash: data.passwordHash,
              cliente: {
                id: 'cliente-1',
                userId: 'user-1',
                ...data.cliente.create,
                domicilios: data.cliente.create.domicilios.create.map((d) => ({
                  id: 'domicilio-1',
                  clienteId: 'cliente-1',
                  ...d,
                })),
              },
            };
            users.set(user.email, user);
            return {
              id: user.id,
              email: user.email,
              role: user.role,
              cliente: {
                id: user.cliente!.id,
                name: user.cliente!.name,
                lastName: user.cliente!.lastName,
                domicilios: user.cliente!.domicilios.map(
                  ({ id, direccion }) => ({ id, direccion }),
                ),
              },
            };
          },
          findMany: () =>
            [...users.values()].map((user) => ({
              id: user.id,
              email: user.email,
              role: user.role,
              cliente: {
                id: user.cliente!.id,
                name: user.cliente!.name,
                lastName: user.cliente!.lastName,
                domicilios: user.cliente!.domicilios.map(
                  ({ id, direccion }) => ({ id, direccion }),
                ),
              },
            })),
          findUnique: ({
            where,
            select,
          }: {
            where: { email?: string; id?: string };
            select?: { role?: boolean; id?: boolean; passwordHash?: boolean };
          }) => {
            const user = where.email
              ? users.get(where.email)
              : [...users.values()].find((u) => u.id === where.id);
            if (!user || !select) return user ?? null;
            if (select.role && !select.id) return { role: user.role };
            return {
              id: user.id,
              email: user.email,
              role: user.role,
              cliente: {
                id: user.cliente!.id,
                name: user.cliente!.name,
                lastName: user.cliente!.lastName,
                domicilios: user.cliente!.domicilios.map(
                  ({ id, direccion }) => ({ id, direccion }),
                ),
              },
              ...(select.passwordHash
                ? { passwordHash: user.passwordHash }
                : {}),
            };
          },
        },
      })
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
  });

  afterAll(async () => {
    await app.close();
  });
  let now = Date.now();
  beforeEach(() => {
    users.clear();
    now += 16 * 60 * 1000;
    jest.spyOn(Date, 'now').mockReturnValue(now);
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('registers, restores a session, logs in with normalized email and logs out', async () => {
    const agent = request.agent(app.getHttpServer());
    const registered = await agent
      .post('/auth/register')
      .send(account)
      .expect(201);
    expect(registered.body).toEqual({
      id: 'user-1',
      email: 'ana@example.com',
      role: 'USER',
      cliente: {
        id: 'cliente-1',
        name: 'Ana María',
        lastName: 'Pérez',
        domicilios: [{ id: 'domicilio-1', direccion: 'San Martín 123' }],
      },
    });
    const cookie = String(registered.headers['set-cookie']);
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Strict');
    expect(cookie).not.toContain('Expires=');
    await agent.get('/auth/me').expect(200).expect(registered.body);
    await agent
      .post('/auth/logout')
      .set('Content-Type', 'application/json')
      .expect(204);
    await agent.get('/auth/me').expect(401);
    const login = await agent
      .post('/auth/login')
      .send({
        email: account.email,
        password: account.password,
        rememberMe: true,
      })
      .expect(200);
    expect(String(login.headers['set-cookie'])).toContain('Max-Age=604800');
    await agent.get('/auth/me').expect(200).expect(registered.body);
  });

  it('restricts the user list to existing admins and never exposes hashes', async () => {
    const agent = request.agent(app.getHttpServer());
    await agent.get('/auth/all').expect(401);
    const registered = await agent
      .post('/auth/register')
      .send(account)
      .expect(201);
    await agent.get('/auth/all').expect(403);
    const admin = users.get('ana@example.com')!;
    expect(admin.role).toBe('USER');
    admin.role = 'ADMIN';
    await agent
      .get('/auth/all')
      .expect(200)
      .expect([{ ...(registered.body as object), role: 'ADMIN' }]);
    const jwt = app.get(JwtService);
    const token = jwt.sign({ sub: 'user-1' }, { expiresIn: 60 });
    await request(app.getHttpServer())
      .get('/auth/all')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect([{ ...(registered.body as object), role: 'ADMIN' }]);
    admin.role = 'USER';
    await agent.get('/auth/all').expect(403);
    users.clear();
    await agent.get('/auth/all').expect(401);
  });

  it('rejects duplicate registrations, wrong passwords and unknown users', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send(account)
      .expect(201);
    await request(app.getHttpServer())
      .post('/auth/register')
      .send(account)
      .expect(409);
    for (const email of [account.email, 'unknown@example.com']) {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password: 'incorrect!' })
        .expect(401);
      expect((response.body as { message: string }).message).toBe(
        'Email o contraseña incorrectos',
      );
      expect(response.headers['set-cookie']).toBeUndefined();
    }
  });

  it.each([
    { email: 123 },
    { email: 'invalid' },
    { domicilios: undefined },
    { domicilios: null },
    { domicilios: [] },
    { domicilios: [[]] },
    { domicilios: [null] },
    { domicilios: ['invalid'] },
    { domicilios: [{ direccion: ' ' }] },
    { domicilios: [{ direccion: 'x'.repeat(201) }] },
    {
      domicilios: Array.from({ length: 21 }, () => ({
        direccion: 'San Martín 123',
      })),
    },
    { name: 123 },
    { name: ' ' },
    { password: 'short' },
    { password: 'á'.repeat(37), repeatedPassword: 'á'.repeat(37) },
    { repeatedPassword: 'different' },
    { role: 'admin' },
    { role: 'ADMIN' },
    { rememberMe: 'true' },
  ])('rejects invalid registration: %j', async (change) => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ ...account, ...change })
      .expect(400);
    expect(users.size).toBe(0);
  });

  it('rejects missing, tampered and expired tokens and deleted users', async () => {
    await request(app.getHttpServer()).get('/auth/me').expect(401);
    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Cookie', 'session=invalid')
      .expect(401);
    const jwt = app.get(JwtService);
    const expired = jwt.sign({ sub: 'user-1' }, { expiresIn: -1 });
    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Cookie', `session=${expired}`)
      .expect(401);
    const deleted = jwt.sign({ sub: 'deleted' }, { expiresIn: 60 });
    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${deleted}`)
      .expect(401);
  });

  it('rejects cross-site forms and rate limits repeated attempts', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .type('form')
      .send(account)
      .expect(415);
    await request(app.getHttpServer())
      .post('/auth/login')
      .set('Sec-Fetch-Site', 'cross-site')
      .send(account)
      .expect(403);
    for (let i = 0; i < 10; i++) {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'invalid' })
        .expect(400);
    }
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send(account)
      .expect(429);
    expect(Number(response.headers['retry-after'])).toBeGreaterThan(0);
  });

  it.each(['/auth/login/', '/AUTH/LOGIN', '/auth/register/', '/AUTH/REGISTER'])(
    'shares the attempt limit with the accepted route variant %s',
    async (path) => {
      for (let attempt = 0; attempt < 10; attempt++) {
        await request(app.getHttpServer())
          .post('/auth/login')
          .send({ email: 'invalid' })
          .expect(400);
      }
      const response = await request(app.getHttpServer())
        .post(path)
        .send({ email: 'invalid' })
        .expect(429);
      expect(Number(response.headers['retry-after'])).toBeGreaterThan(0);
      expect(users.size).toBe(0);
    },
  );
});
