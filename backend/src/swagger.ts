import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function setupSwagger(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('Ciudad Limpia API')
    .setDescription(
      'API de Ciudad Limpia. Para probar la sesión, ejecutá register o login y luego GET /auth/me desde esta página: el navegador conserva la cookie HttpOnly automáticamente. Logout elimina la cookie. Las contraseñas de los ejemplos son ficticias.',
    )
    .setVersion('1.0')
    .addTag('auth', 'Registro, inicio y cierre de sesión')
    .addTag('health', 'Estado de la API')
    .addTag('calles', 'Catálogo de calles de Trenque Lauquen (ADMIN)')
    .addTag('direcciones', 'Direcciones y coordenadas de referencia (ADMIN)')
    .addTag('geocodificacion', 'Búsqueda de direcciones y ubicaciones (ADMIN)')
    .addTag('puntos-limpios', 'Puntos limpios y su ubicación física')
    .addTag(
      'tipos-punto-limpio',
      'Tipos de punto limpio y los residuos que aceptan',
    )
    .addBearerAuth()
    .addCookieAuth('session', { type: 'apiKey', in: 'cookie' }, 'session')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'Ciudad Limpia API',
    swaggerOptions: {
      withCredentials: true,
      requestInterceptor: (request: {
        method: string;
        headers: Record<string, string>;
      }) => {
        // Bodyless mutations also require JSON headers in the endpoint guard.
        if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method))
          request.headers['Content-Type'] = 'application/json';
        return request;
      },
    },
  });
}
