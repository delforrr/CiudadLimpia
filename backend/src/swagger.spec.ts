import type { INestApplication } from '@nestjs/common';
import { SwaggerModule } from '@nestjs/swagger';
import { setupSwagger } from './swagger';

describe('Swagger request headers', () => {
  afterEach(() => jest.restoreAllMocks());

  it.each(['POST', 'PUT', 'PATCH', 'DELETE', 'GET'])(
    'sets JSON headers for %s only when required by the mutation guard',
    (method) => {
      jest.spyOn(SwaggerModule, 'createDocument').mockReturnValue({
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0' },
        paths: {},
      });
      const setup = jest
        .spyOn(SwaggerModule, 'setup')
        .mockImplementation(() => {});
      setupSwagger({} as INestApplication);
      type Request = { method: string; headers: Record<string, string> };
      const options = setup.mock.calls[0][3] as {
        swaggerOptions: { requestInterceptor: (request: Request) => Request };
      };
      const request: Request = {
        method,
        headers: { Authorization: 'Bearer test' },
      };
      expect(options.swaggerOptions.requestInterceptor(request)).toBe(request);
      expect(request.headers.Authorization).toBe('Bearer test');
      expect(request.headers['Content-Type']).toBe(
        method === 'GET' ? undefined : 'application/json',
      );
    },
  );
});
