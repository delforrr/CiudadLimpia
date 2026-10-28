import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { PrismaService } from '../src/prisma/prisma.service';
import type { OpenAPIObject } from '@nestjs/swagger';
import { configureApp } from '../src/configure-app';
import { AppModule } from '../src/app.module';

describe('Public API and documentation (HTTP)', () => {
  let app: INestApplication<App>;
  beforeAll(async () => {
    process.env.JWT_SECRET = 'test-only-secret-at-least-32-characters';
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue({})
      .compile();
    app = module.createNestApplication();
    configureApp(app);
    await app.init();
  });
  afterAll(async () => {
    await app.close();
  });

  it('does not expose the retired auth user list', () =>
    request(app.getHttpServer()).get('/auth/all').expect(404));
  it('reports public liveness', () =>
    request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect({ status: 'ok' }));

  it('documents the executable schemas, authentication and public responses', async () => {
    await request(app.getHttpServer())
      .get('/api/docs/')
      .expect(200)
      .expect(/swagger-ui/);
    const response = await request(app.getHttpServer())
      .get('/api/docs-json')
      .expect(200);
    const document = response.body as OpenAPIObject;
    expect(Object.keys(document.paths).sort()).toEqual([
      '/auth/login',
      '/auth/logout',
      '/auth/me',
      '/auth/register',
      '/health',
      '/users',
      '/users/{id}',
    ]);
    expect(document.components?.securitySchemes?.session).toMatchObject({
      type: 'apiKey',
      in: 'cookie',
      name: 'session',
    });
    for (const path of ['/auth/me', '/users']) {
      expect(document.paths[path].get?.security).toEqual(
        expect.arrayContaining([{ session: [] }, { bearer: [] }]),
      );
    }
    expect(document.paths['/health'].get?.security).toBeUndefined();
    for (const [path, method] of [
      ['/auth/login', 'post'],
      ['/auth/register', 'post'],
      ['/users', 'post'],
      ['/users/{id}', 'patch'],
    ] as const) {
      expect(document.paths[path][method]).toHaveProperty(
        [
          'requestBody',
          'content',
          'application/json',
          'schema',
          'properties',
          'email',
          'format',
        ],
        'email',
      );
    }
    const register = document.paths['/auth/register'].post;
    expect(register).toHaveProperty(
      ['requestBody', 'content', 'application/json', 'schema', 'required'],
      ['email', 'password', 'cliente'],
    );
    expect(register).toHaveProperty(
      [
        'requestBody',
        'content',
        'application/json',
        'schema',
        'additionalProperties',
      ],
      false,
    );
    expect(register).toHaveProperty(
      [
        'requestBody',
        'content',
        'application/json',
        'schema',
        'properties',
        'password',
        'writeOnly',
      ],
      true,
    );
    expect(register).toHaveProperty(
      [
        'requestBody',
        'content',
        'application/json',
        'schema',
        'properties',
        'cliente',
        'required',
      ],
      ['name', 'lastName', 'domicilios'],
    );
    expect(document.paths['/users'].post?.parameters ?? []).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'role', in: 'query' }),
      ]),
    );
    expect(document.paths['/users'].post).toHaveProperty(
      ['requestBody', 'content', 'application/json', 'schema', 'required'],
      ['email', 'password', 'role', 'cliente'],
    );
    expect(document.paths['/users/{id}'].patch).toHaveProperty(
      [
        'requestBody',
        'content',
        'application/json',
        'schema',
        'properties',
        'cliente',
        'required',
      ],
      ['name', 'lastName'],
    );
    for (const [path, method, status] of [
      ['/auth/register', 'post', '201'],
      ['/auth/login', 'post', '200'],
      ['/auth/me', 'get', '200'],
      ['/users', 'get', '200'],
    ] as const) {
      const operation = document.paths[path][method];
      const shape = operation?.responses[status];
      expect(shape).toHaveProperty(
        [
          'content',
          'application/json',
          'schema',
          path === '/users' ? 'items' : 'type',
        ],
        path === '/users'
          ? expect.objectContaining({ type: 'object' })
          : 'object',
      );
      const schema = JSON.stringify(shape);
      expect(schema).not.toContain('passwordHash');
      expect(schema).not.toContain('password');
      expect(schema).not.toContain('token');
    }
    expect(document.paths['/auth/me'].get).toHaveProperty(
      ['responses', '200', 'content', 'application/json', 'schema', 'required'],
      ['id', 'email', 'role', 'cliente'],
    );
    expect(document.paths['/auth/me'].get).toHaveProperty(
      [
        'responses',
        '200',
        'content',
        'application/json',
        'schema',
        'properties',
        'cliente',
        'nullable',
      ],
      true,
    );
    expect(document.paths['/users'].get?.responses).toHaveProperty('403');
    expect(register?.responses).toHaveProperty('409');
    expect(document.paths['/users/{id}'].patch?.responses).toHaveProperty(
      '415',
    );
    expect(document.paths['/users/{id}'].delete?.responses).toHaveProperty(
      '204',
    );
    expect(document.paths['/auth/logout'].post?.responses).toHaveProperty(
      '204',
    );
    await request(app.getHttpServer())
      .get('/api/docs/swagger-ui-init.js')
      .expect(200)
      .expect(/application\/json/);
  });
});
