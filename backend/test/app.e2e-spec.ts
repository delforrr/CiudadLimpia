import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { PrismaService } from '../src/prisma/prisma.service';
import type { OpenAPIObject } from '@nestjs/swagger';
import { setupSwagger } from '../src/swagger';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    process.env.JWT_SECRET = 'test-only-secret-at-least-32-characters';
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .compile();

    app = moduleFixture.createNestApplication();
    setupSwagger(app);
    await app.init();
  });

  it('/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect({ status: 'ok' });
  });

  it('serves Swagger UI and documents auth, public health and safe user responses', async () => {
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
      '/calles',
      '/calles/{id}',
      '/direcciones',
      '/direcciones/puntos-limpios',
      '/direcciones/{id}',
      '/geocodificacion/directa',
      '/geocodificacion/inversa',
      '/health',
      '/puntos-limpios',
      '/puntos-limpios/{id}',
      '/tipos-punto-limpio',
      '/tipos-punto-limpio/{id}',
      '/users',
      '/users/{id}',
    ]);
    expect(document.components?.securitySchemes?.session).toMatchObject({
      type: 'apiKey',
      in: 'cookie',
      name: 'session',
    });
    expect(document.paths['/auth/me'].get?.security).toEqual(
      expect.arrayContaining([{ session: [] }, { bearer: [] }]),
    );
    expect(document.paths).not.toHaveProperty('/auth/all');
    expect(document.paths['/users'].get?.responses).toHaveProperty('403');
    expect(document.paths['/users'].get?.security).toEqual(
      expect.arrayContaining([{ session: [] }, { bearer: [] }]),
    );
    expect(document.paths['/health'].get?.security).toBeUndefined();
    const calle = document.paths['/calles/{id}'];
    expect(calle.patch?.summary).toContain('Renombrar');
    expect(calle.delete?.responses).toHaveProperty('409');
    expect(calle.patch?.security).toEqual(
      expect.arrayContaining([{ session: [] }, { bearer: [] }]),
    );
    expect(document.paths['/direcciones/{id}'].patch?.description).toContain(
      'ambas nulas',
    );
    expect(document.components?.schemas?.CreateDireccionDto).toMatchObject({
      required: ['calle', 'altura'],
      properties: {
        lat: { type: 'number', nullable: true, minimum: -90, maximum: 90 },
        long: { type: 'number', nullable: true, minimum: -180, maximum: 180 },
      },
    });
    expect(
      document.paths['/geocodificacion/directa'].get?.description,
    ).toContain('catálogo público');
    expect(document.paths['/tipos-punto-limpio'].get?.security).toBeUndefined();
    expect(
      document.paths['/tipos-punto-limpio'].post?.responses,
    ).toHaveProperty('201');
    expect(
      document.paths['/tipos-punto-limpio/{id}'].delete?.responses,
    ).toHaveProperty('204');
    expect(Object.keys(document.paths['/users/{id}']).sort()).toEqual([
      'delete',
      'get',
      'patch',
    ]);
    expect(document.paths['/users'].post?.responses).toHaveProperty('201');
    expect(document.paths['/users'].post?.parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'role', in: 'query', required: true }),
      ]),
    );
    expect(document.components?.schemas?.CreateUserDto).toHaveProperty(
      'required',
      expect.arrayContaining(['cliente']),
    );
    expect(document.components?.schemas?.SigninRequestDto).toHaveProperty(
      'required',
      expect.arrayContaining(['domicilios']),
    );
    for (const name of ['DomicilioDto', 'DomicilioResponseDto']) {
      expect(document.components?.schemas?.[name]).toHaveProperty(
        'properties.etiqueta',
        expect.objectContaining({
          type: 'string',
          nullable: true,
          maxLength: 100,
        }),
      );
    }
    expect(document.components?.schemas?.DomicilioDto).toHaveProperty(
      'required',
      ['direccion'],
    );
    expect(document.paths['/users/{id}'].delete?.responses).toHaveProperty(
      '204',
    );
    expect(document.paths['/users/{id}'].patch?.responses).toHaveProperty(
      '415',
    );
    expect(document.paths['/auth/register'].post?.responses).toHaveProperty(
      '409',
    );
    expect(document.paths['/auth/login'].post?.responses).toHaveProperty('401');
    expect(document.paths['/auth/logout'].post?.responses).toHaveProperty(
      '204',
    );
    expect(document.components?.schemas?.UserResponseDto).toMatchObject({
      required: ['id', 'email', 'role', 'cliente'],
    });
    const schema = JSON.stringify(
      document.components?.schemas?.UserResponseDto,
    );
    expect(schema).not.toContain('password');
    expect(schema).not.toContain('token');
    expect(document.components?.schemas?.LoginRequestDto).toMatchObject({
      properties: { password: { writeOnly: true, format: 'password' } },
    });
    await request(app.getHttpServer())
      .get('/api/docs/swagger-ui-init.js')
      .expect(200)
      .expect(/application\/json/);
  });

  afterEach(async () => {
    await app.close();
  });
});
