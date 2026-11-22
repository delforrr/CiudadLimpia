# Ciudad Limpia

Aplicación sobre recolección y separación de residuos de Trenque Lauquen.
Consultar el [README](README.md) para la instalación y los detalles de configuración.

## Tecnologías y estructura

- `frontend/`: React, TypeScript, Vite y MUI.
- `backend/`: NestJS, TypeScript, Prisma y PostgreSQL 17.
- `backend/src/auth/`: autenticación con email, contraseña, bcrypt y JWT.
- `backend/prisma/`: esquema y migraciones de la base.
- `backend/src/swagger.ts`: configuración de Swagger.
- `docker-compose.yml`: única configuración de Compose, ubicada en la raíz.
- Para desarrollo sin contenedores: Node 24.15+ de la línea 24 o Node 26+, y npm 11.17.0.

## Cómo trabajar

- Comunicarse en español, de forma simple y clara.
- Leer el código relacionado antes de modificarlo y reutilizar los patrones existentes.
- Hacer cambios pequeños, con una responsabilidad por pieza y sin agregar funciones no solicitadas.
- Usar componentes de MUI para los controles de la interfaz y estilos en archivos CSS separados.
- Centralizar las llamadas HTTP en servicios. La autenticación usa `frontend/src/services/authService.ts`.
- Mantener el estado y la lógica en hooks personalizados, como `useAuth` y `useAuthForm`; los componentes presentan la interfaz.
- Validar las entradas del backend con DTOs y actualizar Swagger cuando cambie un endpoint.
- Agregar o ajustar pruebas cuando cambie el comportamiento y ejecutar las verificaciones correspondientes.
- Mantener `npm audit` del backend en cero vulnerabilidades; revisar los cambios de dependencias y del lockfile.
- Crear commits atómicos por propósito. Conservar los cambios del usuario y dejar fuera del commit los que no correspondan a la tarea.

## Configuración y seguridad

- `backend/.env` contiene la configuración local y está excluido de Git. No mostrar ni versionar sus secretos.
- Mantener `backend/.env.example` actualizado, con valores de ejemplo.
- `DATABASE_URL` conecta desde el host; `DATABASE_URL_DOCKER` conecta a `postgres:5432` dentro de Docker.
- Las contraseñas se guardan con bcrypt. La sesión usa una cookie JWT HttpOnly y SameSite=Strict.
- Mantener los tokens fuera de localStorage y las contraseñas y hashes fuera de las respuestas y los logs.
- Los POST de autenticación requieren `Content-Type: application/json`, incluso logout sin cuerpo.
- El logout elimina la cookie; el JWT sigue válido hasta vencer. El límite de intentos es local al proceso.
- El cliente de Prisma en `backend/src/generated/prisma/` es generado: actualizar el esquema y ejecutar `npm run prisma:generate`.
- Conservar los datos del volumen PostgreSQL. `docker compose --env-file backend/.env down` mantiene el volumen; `down -v` lo elimina.

## Comandos principales

Desde la raíz, para toda la app:

```sh
docker compose --env-file backend/.env up --build -d --wait
docker compose --env-file backend/.env ps -a
docker compose --env-file backend/.env logs -f backend frontend
```

App en `http://localhost:8080`, Swagger en `/api/docs` y health en `/health`.
El backend incluye Prisma CLI y ejecuta las migraciones antes de iniciar la API. Si fallan, la API no arranca. Los tres servicios deben quedar saludables.
La configuración Docker es local por HTTP. En producción, configurar HTTPS y `NODE_ENV=production` para cookies Secure.

Desde `backend/`:

```sh
npm ci
npm run prisma:generate
npm run prisma:migrate
npm run start:dev
npm run build
npm test -- --runInBand
npm run test:e2e -- --runInBand
npm run audit
```

El backend local usa el puerto 3000. Para revisar lint sin modificar archivos, usar `npx eslint src test`; `npm run lint` aplica correcciones.

Desde `frontend/`: `npm ci`, `npm run dev`, `npm test`, `npm run build` y `npm run lint`.
Para ejecutar solo PostgreSQL durante el desarrollo local, usar `docker compose --env-file backend/.env up -d --wait postgres` desde la raíz.
