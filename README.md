# Ciudad Limpia

Frontend React/Vite y API NestJS con PostgreSQL, Prisma, bcrypt y JWT.

## Desarrollo

Usar Node.js 24.15+ (línea 24) o 26+ y npm 11.17.0.

1. En `backend`, ejecutar `npm ci` y copiar `.env.example` a `.env` si no existe.
2. Elegir `POSTGRES_PASSWORD` y usar la misma contraseña en `DATABASE_URL`. Configurar `JWT_SECRET` con el resultado de `openssl rand -hex 32`. El `.env` local ya configurado contiene credenciales aleatorias y no se versiona.
3. Ejecutar `docker compose --env-file backend/.env up -d --wait postgres` desde la raíz para iniciar solo PostgreSQL 17 local.
4. Ejecutar `npm run prisma:generate` y `npm run prisma:migrate`.
5. Iniciar la API con `npm run start:dev` (puerto 3000).
6. En `frontend`, ejecutar `npm ci` y `npm run dev`. Abrir la URL de Vite.

PostgreSQL escucha en `127.0.0.1:5432` y conserva los datos en el volumen `postgres_data`. Si cambiás `POSTGRES_PORT`, actualizá también el puerto de `DATABASE_URL`. `docker compose --env-file backend/.env stop` detiene la base sin borrar datos; `docker compose --env-file backend/.env down` conserva el volumen. Las variables `POSTGRES_*` inicializan una base nueva: cambiar la contraseña del `.env` no cambia la contraseña de una base ya creada. Para una base existente, actualizar sus credenciales mediante PostgreSQL y luego el `.env`.

Vite envía `/auth`, `/users` y `/api` a `http://localhost:3000`. En producción, servir frontend y API bajo el mismo origen, enrutar esos prefijos al backend y usar HTTPS con `NODE_ENV=production` para cookies Secure. Los scripts automáticos de dependencias están desactivados en `backend/.npmrc`. Prisma se genera con el comando explícito anterior.

`GET /health` es público y devuelve `{ "status": "ok" }` cuando la API está levantada; no comprueba PostgreSQL.

El frontend centraliza las rutas de sesión en `src/services/authService.ts` y la edición del perfil en `src/services/userService.ts`; ambos usan `http.ts`. `useAuth` administra la sesión y `useAuthForm` administra el formulario; los componentes presentan la interfaz con componentes MUI y estilos CSS.

## Arquitectura del backend

`AccountsModule` registra los controladores de autenticación y usuarios, sus servicios y los guards. `AuthService` verifica credenciales y emite sesiones; delega la creación de cuentas en `UserService`, que concentra las escrituras y el mapeo de errores Prisma a 409/404. `PrismaModule` proporciona una sola instancia del cliente a cuentas y puntos limpios, sin depender de autenticación.

El arranque y las pruebas HTTP usan la misma configuración de aplicación. La política HTTP mantiene `no-store`, rechazo cross-site y Content-Type JSON; el límite de intentos de registro/login tiene su propio guard. Se usa `AuthGuard('jwt')` de Passport directamente y se conserva `publicUserSelect` como lista explícita de campos públicos.

Este refactor no cambia el esquema, las migraciones históricas ni la relación explícita de residuos. La integración funcional de puntos limpios sigue fuera de alcance.

## App completa con Docker

Requiere Docker con Compose; no hace falta instalar Node en el host. Toda la configuración está en `docker-compose.yml`, en la raíz. Usar `--env-file backend/.env` para cargar las variables existentes sin duplicar credenciales.

En una copia nueva del repo, copiar `backend/.env.example` a `backend/.env`, elegir una contraseña y generar `JWT_SECRET` con `openssl rand -hex 32`. Usar las mismas credenciales en ambas URLs: `DATABASE_URL` apunta a `127.0.0.1` para desarrollo fuera de Docker y `DATABASE_URL_DOCKER` apunta a `postgres:5432` para los contenedores. El `.env` local existente ya está configurado.

Desde la raíz:

```sh
docker compose --env-file backend/.env up --build -d --wait
docker compose --env-file backend/.env ps
docker compose --env-file backend/.env logs -f backend frontend
```

La primera ejecución descarga las imágenes y dependencias; las siguientes reutilizan la caché de Docker.

- App: [http://localhost:8080](http://localhost:8080).
- Swagger: [http://localhost:8080/api/docs](http://localhost:8080/api/docs).
- Health: [http://localhost:8080/health](http://localhost:8080/health).

`FRONTEND_PORT` cambia el puerto web. Nginx sirve el build de React y reenvía `/auth`, `/users`, `/api` y `/health` al backend para mantener el mismo origen. El backend no publica un puerto al host; PostgreSQL conserva su acceso local en el puerto configurado y reutiliza el volumen existente.

Compose espera a que PostgreSQL esté saludable e inicia el backend. Su comando ejecuta `npm run prisma:migrate` y, solo si termina correctamente, arranca la API. Luego inicia el frontend. No hay un servicio separado de migraciones. La imagen del backend incluye Prisma CLI, el esquema, las migraciones y su configuración; usa un usuario sin privilegios y dependencias de producción. Las migraciones se comprueban en cada arranque del backend. Las imágenes no contienen archivos `.env` ni credenciales de la base; se reciben al iniciar los contenedores.

El backend confía en un único proxy cuando `TRUST_PROXY=1`, configurado por Compose. Nginx sobrescribe la IP reenviada para que el límite de intentos use la IP del cliente. No publicar directamente ese backend sin revisar la confianza en el proxy.

La configuración local usa `NODE_ENV=development` para permitir la cookie de sesión por HTTP. Para publicar detrás de HTTPS, usar `NODE_ENV=production` en el entorno de despliegue para activar Secure. Este Compose no configura certificados TLS.

`docker compose --env-file backend/.env stop` detiene todos los servicios. `docker compose --env-file backend/.env down` elimina los contenedores y mantiene la base; no usar `down -v` si se quieren conservar los datos. Para actualizar el código, repetir el comando de arranque con `--build`. Para volver al desarrollo con Vite y Nest fuera de Docker, detener `backend` y `frontend` y levantar únicamente `postgres`.

## Autenticación

Los domicilios guardan `direccion` y una `etiqueta` opcional de hasta 100 caracteres (por ejemplo, Casa o Trabajo) en PostgreSQL. Registro y edición de perfil permiten agregarlos desde la tarjeta de domicilios; no se guardan en localStorage.

- `POST /auth/register`: `{ email, password, cliente: { name, lastName, domicilios: [{ direccion, etiqueta? }] } }`. Crea una cuenta USER e inicia sesión. La confirmación de contraseña queda en el formulario y no se envía al servidor. El registro rechaza `role`, `rememberMe` y `repeatedPassword`.
- `POST /auth/login`: `{ email, password, rememberMe? }`.
- `GET /auth/me`: usuario autenticado, sin hash ni token; devuelve 401 si la sesión venció.
- `POST /auth/logout`: elimina la cookie del navegador.

Las cuentas nuevas y existentes reciben el rol `USER` por defecto. El rol `ADMIN` se asigna directamente en la base por un operador autorizado o mediante el endpoint de administración de cuentas; el registro público no acepta roles. El listado comprueba el rol actual en cada solicitud y no incluye hashes ni tokens.

Los POST requieren `Content-Type: application/json`. El email se normaliza a minúsculas y se recortan sus espacios. La contraseña conserva sus espacios y símbolos: mínimo 8 caracteres y máximo 72 bytes UTF-8, por el límite de bcrypt (12 rondas).

El JWT se guarda en una cookie HttpOnly y SameSite=Strict. Dura una hora; con Recordarme dura siete días y la cookie persiste. El guard también acepta `Authorization: Bearer <JWT>` para clientes API. El logout elimina la cookie; un JWT copiado previamente sigue válido hasta vencer. No se implementaron refresh tokens ni recuperación de contraseña.

La verificación usa `passport-jwt` mediante `JwtStrategy` y el guard de `@nestjs/passport`. Solo acepta HS256 y comprueba la firma, el vencimiento y un `sub` no vacío. Si se envían ambos mecanismos, Bearer tiene prioridad sobre la cookie. La estrategia consulta la cuenta y su rol actual en PostgreSQL; deja esa identidad en `request.user` antes de que los guards autoricen la operación.

Registro y login comparten diez intentos por IP cada quince minutos; el guard de intentos se aplica solo a esos endpoints y devuelve `Retry-After` al bloquearlos. El contador es local al proceso: usar un limitador compartido con múltiples réplicas y configurar la IP real en el proxy antes de desplegar.

## Cuentas, clientes y domicilios

`User` contiene email, hash y rol. Tiene un `Cliente` opcional con nombre, apellido y una lista de `Domicilio` (dirección). Una cuenta administrativa puede no tener cliente. El registro público crea cuenta y cliente juntos, de forma atómica.

La migración `20261023000000_separate_cliente` copia los nombres y apellidos existentes a `Cliente` antes de quitarlos de `User`, en una transacción. Conserva IDs de cuentas, emails, hashes y roles; no inventa domicilios. Los domicilios que la pantalla antigua guardaba en localStorage no están en PostgreSQL y deben ingresarse nuevamente.

Las respuestas de autenticación y usuarios ahora tienen `{ id, email, role, cliente }`; `cliente` puede ser `null` o `{ id, name, lastName, domicilios: [{ id, direccion, etiqueta }] }`. Los consumidores anteriores deben leer los nombres dentro de `cliente`. El registro requiere `cliente.domicilios: [{ direccion }]`, con al menos una dirección.

| Endpoint | Permiso | Comportamiento |
| --- | --- | --- |
| `POST /users` | ADMIN | Crea cuenta con `role` en el cuerpo JSON, cliente y al menos un domicilio |
| `GET /users` | ADMIN | Lista cuentas con su cliente y domicilios |
| `GET /users/:id` | Titular o ADMIN | Consulta una cuenta |
| `PATCH /users/:id` | Titular o ADMIN | Actualiza cuenta y cliente juntos |
| `DELETE /users/:id` | ADMIN | Elimina cuenta, cliente y domicilios |

`POST /users` recibe `{ email, password, role, cliente: { name, lastName, domicilios: [{ direccion, etiqueta? }] } }`. `role` es obligatorio en el JSON (`USER` o `ADMIN`); la query antigua ya no lo proporciona. El registro público siempre crea `USER` y rechaza roles.

`PATCH` acepta `email`, `password`, `role` y `cliente` de forma opcional; solo ADMIN puede enviar `role`. Al enviar `cliente`, se requieren `name` y `lastName`; omitir `domicilios` conserva la lista de un cliente existente y enviar el array la reemplaza de forma atómica (se generan nuevos IDs). Tanto el alta como el reemplazo requieren entre 1 y 20 direcciones de hasta 200 caracteres, sin espacios vacíos. No se puede vaciar la lista. Para asociar un cliente a una cuenta antigua, enviar también sus domicilios.

Esta obligación se valida en la API. Las cuentas antiguas sin domicilios pueden iniciar sesión y consultar su perfil, pero la interfaz las redirige a `/perfil` hasta que completen una dirección. La API rechaza con 400 cualquier actualización de una cuenta sin domicilios que no incluya los datos necesarios para completarlos; no se inventan direcciones ni se modifica el esquema de PostgreSQL. No hay asignación de un domicilio principal.

Los identificadores de `/users/:id` son UUID. Las escrituras requieren `Content-Type: application/json`, incluso DELETE sin cuerpo. Los errores son 400 (validación), 401 (sesión ausente o usuario eliminado), 403 (sin permisos), 404 (cuenta inexistente) y 409 (email duplicado). `/auth/all` se eliminó; el listado administrativo único es `GET /users`. Los hashes nunca se incluyen en las respuestas. Cambiar la contraseña no revoca JWT emitidos: siguen válidos hasta vencer.

El formulario de registro está en `/registro`, y el inicio de sesión en `/perfil`. Usan controles MUI y Zod para validar cada campo al salir de él y al enviar; el perfil también valida con Zod antes de guardar. Los domicilios se ingresan uno por línea; se validan nombres, email y los límites de las direcciones antes de guardar. La lógica vive en `useAuthForm` y `useProfileForm`.

El apartado Usuarios de `/admin` permite crear, consultar, editar y eliminar cuentas mediante `/users`. El alta solicita nombre, apellido, email, contraseña con confirmación, rol y al menos un domicilio. La edición conserva el formulario existente; no muestra contraseñas. `useAdminUsers` administra el estado y `userService` centraliza las solicitudes. La búsqueda y el filtro por rol permiten encontrar cuentas; la eliminación pide confirmación. El panel impide eliminar la cuenta de la sesión o cambiar su propio rol.

## Puntos limpios y direcciones

El listado y la consulta de puntos limpios son públicos. El alta, la edición y la baja requieren rol ADMIN y JSON. El alta recibe nombre, tipo, coordenadas y una de dos opciones de dirección, un `direccionId` existente o `direccion` con calle y altura. Para el autocompletado administrativo, consultar `GET /direcciones/puntos-limpios?buscar=Roca`. `GET /direcciones` incluye también domicilios de clientes y requiere rol ADMIN.

## Swagger

Con el backend iniciado, abrir [Swagger UI](http://localhost:3000/api/docs). El documento OpenAPI se publica en [JSON](http://localhost:3000/api/docs-json) y [YAML](http://localhost:3000/api/docs-yaml). Ajustar el puerto si se modifica `PORT`.

La documentación incluye health, registro, login, sesión y logout, con ejemplos, límites de validación, códigos de error y el esquema del usuario público. Las contraseñas de los ejemplos son ficticias.

Para probar la autenticación, ejecutar `POST /auth/register` o `POST /auth/login` con **Try it out** y luego `GET /auth/me`. La cookie HttpOnly se conserva automáticamente en el navegador al usar el mismo origen. No es necesario copiarla en **Authorize**. También se documenta Bearer para clientes que ya tengan un JWT. `POST /auth/logout` elimina la cookie; Swagger agrega el encabezado JSON requerido en POST, PUT, PATCH y DELETE, incluso cuando no hay cuerpo.

La integración usa [Nest Swagger](https://docs.nestjs.com/openapi/introduction) y documenta los dos mecanismos de autenticación como alternativas.

## Geocodificación

Desde Swagger, una sesión ADMIN puede probar
`GET /api/geocodificacion/directa?calle=Villegas&altura=860` o
`GET /api/geocodificacion/inversa?lat=-35.97&long=-62.73`.
Las rutas anteriores bajo `/geocodificacion` siguen disponibles en el backend.
La búsqueda directa devuelve hasta tres ubicaciones aproximadas en la ciudad
de Trenque Lauquen. Una sugerencia con coordenadas puede tener `altura: null`.
Si la lista está vacía, se puede usar la dirección ingresada
y elegir las coordenadas manualmente. La inversa conserva el pin consultado y
puede sugerir solo la calle si falta la altura.

Confirmá la calle, la altura y el pin antes de guardar el punto limpio.
Al mostrar o redistribuir resultados, incluí la atribución «Servicio Georef –
argentina.gob.ar/georef» e indicá si modificaste los datos. Consultá la
[licencia y los límites de Georef](https://www.argentina.gob.ar/georef/condiciones-de-uso-y-licencia).

## Sugerencia de trayectos

Desde Swagger, una sesión ADMIN puede ejecutar `POST /api/trayectos/sugerencia`
con un JSON que incluya al menos dos coordenadas. El orden del arreglo define el
recorrido. [Ejemplo y prueba local de Trayectos](docs/specs/trayectos/backend/prueba-local.md)

El motor devuelve una línea GeoJSON con posiciones `[longitud, latitud]` y la
atribución en `fuente`. La sugerencia se calcula para revisión y el trayecto se
guarda cuando el operador confirma la línea mediante la operación de guardado.
Si el motor no encuentra una conexión (422) o falla (502, 503 o 504), se puede
seguir dibujando manualmente.

`OSRM_BASE_URL` configura la URL base de un servidor OSRM para autos, incluida
la ruta base si corresponde. En desarrollo, un valor vacío usa la demostración
pública de FOSSGIS, limitada a una consulta por segundo por proceso. Para uso
regular, configurar un servidor propio o contratado. En producción, una URL
vacía deja la sugerencia sin configurar. Cada cálculo tiene un plazo de 5 segundos.
[Política de FOSSGIS](https://routing.openstreetmap.de/about.html)

Al mostrar la sugerencia, incluir la atribución de `fuente` y un enlace para
corregir el mapa. [Atribución de OpenStreetMap](https://www.openstreetmap.org/copyright)
[Corregir el mapa](https://www.openstreetmap.org/fixthemap)

## Dependencias y verificación

El backend usa Nest 12, Prisma 7 y Zod 4.6.7. Los contratos de cuentas usan Zod y los de puntos limpios, tipos y direcciones usan DTOs con decoradores. `StandardSchemaValidationPipe` valida las entradas de cuentas y Swagger documenta esos mismos esquemas. Los objetos de entrada son estrictos, incluidos los anidados: campos desconocidos producen 400 y `message` es una lista. PATCH permite omitir campos, pero rechaza `null` salvo en la etiqueta del domicilio. Los límites de texto cuentan caracteres Unicode y la contraseña conserva el límite adicional en bytes. TypeScript permanece en 6.0 por los rangos soportados por Nest Swagger, typescript-eslint y ts-jest. Prisma requiere `@prisma/adapter-pg` y genera el cliente en `backend/src/generated/prisma` (ignorado por Git).

El override de `@istanbuljs/load-nyc-config > js-yaml` elimina la rama vulnerable de YAML 3. El consumidor utiliza `load`, que existe en YAML 4; las pruebas incluyen lectura de configuración YAML y cobertura para comprobar esta compatibilidad.

En `backend`:

```sh
npm run prisma:generate
npm run build
npm test -- --runInBand
npm run test:e2e -- --runInBand
npm run test:cov -- --runInBand
npm run lint
npm run audit
```

En `frontend`: `npm test`, `npm run build` y `npm run lint`.

Las pruebas HTTP ejecutan Nest con su configuración real de validación. La mayoría usa persistencia simulada. La suite de Trayectos usa una base PostgreSQL de prueba para verificar transacciones cuando se define `TEST_DATABASE_URL`. Un resultado de cero vulnerabilidades de `npm audit` corresponde al lockfile y a los avisos vigentes al ejecutar la auditoría. [Comandos y casos de prueba de Trayectos](docs/specs/trayectos/backend/prueba-local.md)

Referencias de migración: [Nest 12](https://docs.nestjs.com/migration-guide), [Prisma 7](https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7).

### Pendiente de seguridad aceptado

El override de `jest-config > deepmerge` usa `@stackline/deepmerge@1.1.0` para corregir el aviso de esa dependencia de pruebas. `npm run audit` verifica los avisos vigentes.
