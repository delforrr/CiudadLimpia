import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '../src/generated/prisma/client';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';
import { PrismaService } from '../src/prisma/prisma.service';
import { AuthService } from '../src/auth/auth.service';
import { publicUserSelect } from '../src/user/user.select';

describe('Email/password authentication (HTTP)', () => {
  let app: INestApplication<App>;
  type UserRecord = Prisma.UserGetPayload<{ select: typeof publicUserSelect }>;
  const users = new Map<string, { user: UserRecord; passwordHash: string }>();
  const frente = {
    calle: 'San Martín',
    altura: 123,
    lat: -35.97,
    long: -62.73,
  };
  const direccionId = '00000000-0000-4000-8000-000000000001';
  const direccion = {
    ...frente,
    id: direccionId,
    calle: { calle: frente.calle },
  };
  const account = {
    email: ' ANA@Example.com ',
    password: ' pass!word á ',
    cliente: {
      name: 'Ana María',
      lastName: 'Pérez',
      domicilios: [
        {
          direccion: { ...frente, calle: ' San   Martín ' },
          etiqueta: ' Casa ',
        },
      ],
    },
  };

  beforeAll(async () => {
    process.env.JWT_SECRET = 'test-only-secret-at-least-32-characters';
    const db = {
      user: {
        create: jest.fn(
          ({
            data,
          }: {
            data: {
              email: string;
              passwordHash: string;
              cliente: {
                create: {
                  name: string;
                  lastName: string;
                  domicilios: {
                    create: { direccionId: string; etiqueta?: string | null }[];
                  };
                };
              };
            };
          }) => {
            if (users.has(data.email))
              throw new Prisma.PrismaClientKnownRequestError(
                'Duplicate email',
                { code: 'P2002', clientVersion: '7.10.1' },
              );
            const profile = data.cliente.create;
            const user: UserRecord = {
              id: 'user-1',
              email: data.email,
              role: 'USER',
              cliente: {
                id: 'cliente-1',
                name: profile.name,
                lastName: profile.lastName,
                domicilios: profile.domicilios.create.map((domicilio) => ({
                  direccion,
                  etiqueta: domicilio.etiqueta ?? null,
                })),
              },
            };
            users.set(user.email, { user, passwordHash: data.passwordHash });
            return user;
          },
        ),
        findUnique: jest.fn(
          ({
            where,
            select,
          }: {
            where: { email?: string; id?: string };
            select?: { passwordHash?: boolean };
          }) => {
            const stored = where.email
              ? users.get(where.email)
              : [...users.values()].find(({ user }) => user.id === where.id);
            return stored
              ? {
                  ...stored.user,
                  ...(select?.passwordHash
                    ? { passwordHash: stored.passwordHash }
                    : {}),
                }
              : null;
          },
        ),
      },
      calle: { upsert: jest.fn().mockResolvedValue({ id: 'calle-1' }) },
      direccion: {
        createMany: jest.fn(),
        findUniqueOrThrow: jest.fn().mockResolvedValue(direccion),
      },
    };
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue({
        ...db,
        $transaction: (operation: (tx: typeof db) => unknown) => operation(db),
      })
      .compile();
    app = module.createNestApplication();
    configureApp(app);
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
        domicilios: [
          {
            ...frente,
            id: direccionId,
            direccion: 'San Martín 123',
            etiqueta: 'Casa',
          },
        ],
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

  it('registers and starts a session without an address', async () => {
    const agent = request.agent(app.getHttpServer());
    const registered = await agent
      .post('/auth/register')
      .send({
        ...account,
        cliente: {
          name: account.cliente.name,
          lastName: account.cliente.lastName,
        },
      })
      .expect(201);
    expect(registered.body).toMatchObject({
      role: 'USER',
      cliente: { domicilios: [] },
    });
    await agent.get('/auth/me').expect(200).expect(registered.body);
  });

  it.each([
    { email: 123 },
    { email: 'invalid' },
    { cliente: undefined },
    { cliente: null },
    ...[
      { domicilios: null },
      { domicilios: [] },
      { domicilios: [[]] },
      { domicilios: [null] },
      { domicilios: ['invalid'] },
      { domicilios: [{ direccion: ' ' }] },
      { domicilios: [{ direccion: 'x'.repeat(201) }] },
      {
        domicilios: [{ direccion: frente, etiqueta: 'x'.repeat(101) }],
      },
      { domicilios: [{ direccion: frente, etiqueta: 123 }] },
      {
        domicilios: Array.from({ length: 21 }, () => ({
          direccion: frente,
        })),
      },
      { name: 123 },
      { name: ' ' },
      { role: 'ADMIN' },
    ].map((change) => ({ cliente: { ...account.cliente, ...change } })),
    { password: 'short' },
    { password: 'á'.repeat(37) },
    { password: '😀'.repeat(4) },
    { repeatedPassword: account.password },
    { name: 'Ana', lastName: 'Pérez', domicilios: account.cliente.domicilios },
    { role: 'admin' },
    { role: 'ADMIN' },
    { rememberMe: true },
  ])('rejects invalid registration: %j', async (change) => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ ...account, ...change })
      .expect(400);
    expect(users.size).toBe(0);
  });

  it.each([
    { rememberMe: null },
    { rememberMe: 'true' },
    { role: 'ADMIN' },
    { repeatedPassword: account.password },
    { password: '😀'.repeat(4) },
  ])('rejects invalid login fields: %j', async (change) => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: account.email, password: account.password, ...change })
      .expect(400);
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

  it('accepts the Bearer scheme without depending on its case', async () => {
    const registered = await request(app.getHttpServer())
      .post('/auth/register')
      .send(account)
      .expect(201);
    const token = app.get(JwtService).sign({ sub: 'user-1' });
    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `bearer ${token}`)
      .expect(200)
      .expect(registered.body);
  });

  it('gives Bearer credentials priority over the session cookie', async () => {
    const registered = await request(app.getHttpServer())
      .post('/auth/register')
      .send(account)
      .expect(201);
    const cookie = String(registered.headers['set-cookie']).split(';')[0];
    const token = app.get(JwtService).sign({ sub: 'user-1' });
    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Cookie', 'other=value; session=invalid')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect(registered.body);
    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Cookie', cookie)
      .set('Authorization', 'Bearer invalid')
      .expect(401);
  });

  it.each([{}, { sub: '' }, { sub: 123 }, { sub: null }])(
    'rejects a signed token without a valid subject: %j',
    async (payload) => {
      const getUser = jest.spyOn(app.get(AuthService), 'getUser');
      const token = app.get(JwtService).sign(payload);
      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);
      expect(getUser).not.toHaveBeenCalled();
    },
  );

  it('rejects tokens signed with another secret or algorithm', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send(account)
      .expect(201);
    const tokens = [
      new JwtService({ secret: 'another-test-only-secret' }).sign({
        sub: 'user-1',
      }),
      app.get(JwtService).sign({ sub: 'user-1' }, { algorithm: 'HS384' }),
    ];
    for (const token of tokens) {
      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);
    }
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
