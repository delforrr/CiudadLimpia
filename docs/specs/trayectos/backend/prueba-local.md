# Umbral de calidad para probar Trayectos en local

Desde la raíz del repositorio, levantá la aplicación y comprobá que los tres servicios estén saludables.

```sh
docker compose --env-file backend/.env up --build -d --wait
docker compose --env-file backend/.env ps
```

Abrí [Swagger de Ciudad Limpia](http://localhost:8080/api/docs) y usá `POST /auth/login` con una cuenta `ADMIN`. `GET /auth/me` debe devolver `role: ADMIN`. Swagger conserva la cookie en el navegador. Ejecutá los casos desde ese mismo origen para probar el proxy junto con la API.

## Alta manual de referencia

Enviá este cuerpo a `POST /api/trayectos`.

```json
{
  "nombre": "Roca a San Martín",
  "localidadId": "06826050",
  "puntos": [
    {
      "orden": 0,
      "lat": -35.97720613073469,
      "long": -62.732024770306126,
      "direccion": { "calle": "Julio A Roca", "altura": 860 }
    },
    {
      "orden": 1,
      "lat": -35.977324668424245,
      "long": -62.73014682282828,
      "direccion": { "calle": "Villegas", "altura": 230 }
    },
    {
      "orden": 2,
      "lat": -35.97593898340816,
      "long": -62.7294907782653,
      "direccion": { "calle": "San Martín", "altura": 410 }
    }
  ],
  "geometria": {
    "type": "LineString",
    "coordinates": [
      [-62.732024770306126, -35.97720613073469],
      [-62.73014682282828, -35.977324668424245],
      [-62.7294907782653, -35.97593898340816]
    ]
  }
}
```

Guardá el `id` del trayecto y los `direccionId` de sus puntos. GeoJSON usa pares `[long, lat]`. Para un frente existente, la API admite diferencias de redondeo de hasta `1e-12` grados por coordenada. Si el catálogo tiene otro pin, usá el `direccionId` del 409 y omití `direccion`, `lat` y `long` en ese punto para confirmar el pin guardado.

## Casos que deben pasar

| Caso | Resultado esperado |
| --- | --- |
| Roles | `GET /api/trayectos` devuelve `401` sin sesión, `403` con `USER` y `200` con `ADMIN`. |
| Catálogo | `GET /api/localidades` devuelve Trenque Lauquen con ID `06826050`, incluso sin salida a Internet. |
| Alta y reapertura | El alta devuelve `201`. El detalle devuelve la misma línea, puntos ordenados y el pin de cada dirección. |
| Reutilizar un frente | Enviá `{ "orden": 0, "direccionId": "<uuid>" }` al referenciar uno de los puntos. Podés incluir `lat` y `long` juntas si coinciden con el pin guardado. |
| Pin distinto | Reenviá la misma calle y altura con otro pin. Debe devolver `409` con `code: "PIN_DIRECCION_DISTINTO"` y la dirección guardada. Reenviá su ID para confirmar el pin o indicá el otro frente con su calle, altura y coordenadas. |
| Entrada inválida | Un orden repetido, localidad o dirección inexistente, calle sin altura, una sola coordenada, coordenadas fuera de rango o una línea sin dos posiciones válidas distintas devuelve `400`. Una escritura rechazada conserva el trayecto anterior y revierte las direcciones nuevas. |
| Edición | Enviá el trayecto completo a `PATCH /api/trayectos/{id}` con la geometría y los puntos. Usá un nuevo `direccionId` o indicá un nuevo frente si cambia la dirección de un punto. |
| GeoRef | La geocodificación directa consulta primero el catálogo compartido. GeoRef puede sugerir una calle con `altura: null`. Completá los datos y confirmá ambas coordenadas para guardar el frente. |

## Domicilios, puntos limpios y corrección del pin

- `POST /direcciones` recibe `calle`, `altura`, `lat` y `long`. Devuelve `201` con `id`, `direccion` como texto y los cuatro datos del frente. Un alta directa duplicada devuelve `409`.
- En `POST /auth/register`, `POST /users` y `PATCH /users/{id}`, cada elemento de `cliente.domicilios` recibe `{ "direccionId": "<uuid>", "etiqueta": "Casa" }` o `{ "direccion": { "calle": "Roca", "altura": 850, "lat": -35.97, "long": -62.73 }, "etiqueta": "Casa" }`. La etiqueta es opcional. El registro permite omitir domicilios. En la edición, omitir la lista conserva los vínculos y enviar `[]` los quita todos. Una misma dirección repetida en la lista devuelve `400`.
- Registrá dos vecinos con el mismo frente y etiquetas distintas. Ambos deben recibir el mismo ID con su propia etiqueta. Al quitar el vínculo de un vecino o eliminar su cuenta, el frente y el otro domicilio siguen disponibles. Un domicilio de texto libre devuelve `400`, incluido el formato que envía el formulario actual.
- En `POST /puntos-limpios`, enviá `nombre`, `tipoId` y `direccionId`, o `nombre`, `tipoId`, `direccion: { calle, altura }`, `lat` y `long`. En `PATCH /puntos-limpios/{id}`, enviá el nuevo `direccionId` para cambiar de frente. Si incluís las dos coordenadas en un alta con ID o en un PATCH, el backend las compara con el pin guardado.
- En `PATCH /direcciones/{id}`, enviá las dos coordenadas nuevas como ADMIN. Si incluís calle o altura, deben coincidir con el frente. Volvé a consultar el domicilio, el punto limpio y el trayecto para ver el pin corregido. Los vértices de la LineString se conservan. Un usuario sin rol ADMIN recibe `403`.

## Datos previos a la migración

Probá la cadena de migraciones en una base vacía y ensayá la actualización en una copia de la base poblada antes del despliegue. La migración usa el pin de la dirección cuando ya existe. Si un frente carece de pin, puede recuperar el de sus puntos cuando todos coinciden. Una dirección histórica de texto libre se vincula a un frente completo cuando coinciden la calle y altura escritas. En ese caso, el domicilio pasa a devolver el ID compartido y conserva su etiqueta.

Para revisar los candidatos en la base anterior, consultá las filas incompletas.

```sql
SELECT id, "clienteId", direccion, "calleId", altura, lat, long
FROM "Direccion"
WHERE "calleId" IS NULL OR altura IS NULL OR lat IS NULL OR long IS NULL;
```

Si falta identificar algún frente, confirmá calle, altura y pin con la base anterior. Completá los frentes del catálogo desde `/direcciones` de la versión anterior. Para un domicilio de texto libre, guardá el texto confirmado con el formato `Calle altura` y asegurate de que ese frente exista con pin en el catálogo. Si un trayecto o punto limpio no tiene frente confirmado, reasignalo a una dirección completa y revisá las referencias antiguas que hayan quedado sin usar. Dos domicilios del mismo cliente que convergen al mismo frente requieren elegir qué etiqueta conservar.

### Recuperar un intento fallido

La migración se aplica de forma atómica. Si encuentra direcciones incompletas, coincidencias ambiguas o domicilios duplicados, PostgreSQL devuelve el motivo y revierte los cambios. `current transaction is aborted` indica que falló una sentencia anterior. Para un intento hecho con Compose, podés consultar el error original en los logs de PostgreSQL.

```sh
docker compose --env-file backend/.env logs --tail=100 postgres
```

Si usás Prisma desde el host, ejecutá lo siguiente en `backend/`, con la misma conexión `DATABASE_URL` del intento fallido. Confirmá primero que la migración figura como fallida y corregí los datos indicados antes de desplegar.

```sh
npx prisma migrate status
npx prisma migrate resolve --rolled-back 20261121010000_direccion_compartida
npm run prisma:migrate
```

Si el backend de Compose intentó aplicar la migración, usá el servicio `backend` para que Prisma se conecte a la misma base de Compose. Reconstruí la imagen para que incluya la migración actualizada.

```sh
docker compose --env-file backend/.env build backend
docker compose --env-file backend/.env run --rm --no-deps backend npx prisma migrate status
docker compose --env-file backend/.env run --rm --no-deps backend npx prisma migrate resolve --rolled-back 20261121010000_direccion_compartida
docker compose --env-file backend/.env up -d --wait
```

## Sugerencia por calles

Enviá este cuerpo a `POST /api/trayectos/sugerencia`.

```json
{
  "puntos": [
    { "lat": -35.97720613073469, "long": -62.732024770306126 },
    { "lat": -35.977324668424245, "long": -62.73014682282828 },
    { "lat": -35.97593898340816, "long": -62.7294907782653 }
  ]
}
```

Con OSRM disponible, debe devolver `200` y una geometría `LineString` que conecta los puntos cercanos a Roca, Villegas y San Martín en el orden enviado. El caso de referencia devolvió 21 vértices y unos 1.022 m con el perfil de automóvil. Los datos viales pueden cambiar. Consultá el detalle guardado y verificá que conserva su geometría anterior. Después podés copiar la sugerencia, ajustarla y enviarla en el `PATCH`. [Motor OSRM de FOSSGIS y datos de OpenStreetMap](https://routing.openstreetmap.de/about.html)

Si OSRM no encuentra una ruta, la sugerencia devuelve `422`. Si el servicio no está disponible, devuelve `503`. Una respuesta inválida devuelve `502` y un tiempo de espera agotado devuelve `504`. En esos casos, comprobá que podés reabrir el trayecto guardado y enviar una línea manual. Las pruebas automatizadas simulan estos resultados.

El backend amplía el margen de conexión por dirección IP para alcanzar al servidor público desde redes con mayor latencia. La consulta a OSRM conserva su plazo total de 5 segundos.

## Verificaciones automatizadas

El umbral es compilación y lint sin errores, todas las pruebas en verde con la suite de persistencia activa, y cero vulnerabilidades en `npm run audit`. Exportá `TEST_DATABASE_URL` con la URL de una base PostgreSQL 17 de prueba separada de la base de la aplicación. Desde `backend/`, ejecutá lo siguiente.

```sh
npm ci
DATABASE_URL="$TEST_DATABASE_URL" npm run prisma:generate
DATABASE_URL="$TEST_DATABASE_URL" npm run prisma:migrate
npm run build
npx eslint src test
npm test -- --runInBand
npm run test:e2e -- --runInBand
npm run audit
```

Con `TEST_DATABASE_URL` exportada, la suite HTTP verifica en PostgreSQL que un alta o una edición rechazada deja intactos los datos, que dos altas simultáneas comparten una fila y que PostgreSQL rechaza pines nulos y frentes duplicados. La aceptación local requiere además que pasen los casos de Swagger con una sesión `ADMIN`.

## Probar telemetría y push desde el backend

Configurar `TELEMETRIA_PROVEEDOR_ID=mock` y `TELEMETRIA_TOKEN` en `backend/.env`. Con el backend en ejecución, guardar un archivo de posiciones GPS de prueba como lista de pares `[longitud, latitud]`. Desde `backend/`, ejecutar:

```sh
node --env-file=.env scripts/mock-telemetria.mjs posiciones.json CAMION_ID TRAYECTO_ID
```

El mock envía una posición cada cinco segundos. `TELEMETRIA_URL` permite indicar otra URL base local, como `http://localhost:8080` para Compose. Un cuarto argumento permite continuar una prestación con el mismo UUID. Cada pasada distinta usa un UUID nuevo. `GET /api/hoy/domicilios/:direccionId/mapa` requiere la sesión del titular del domicilio y devuelve los camiones vigentes que pasan por su frente.

Los e2e de PostgreSQL usan `TEST_DATABASE_URL` con el esquema ya migrado y un transporte de prueba para Web Push. Mantener `PUSH_HABILITADO=0` hasta validar las tolerancias de cobertura con casos locales. Para pruebas de entrega real, configurar también las tres variables VAPID de `backend/.env.example`; la suscripción del navegador pertenece a la integración de frontend.

## Demo de recolección con dos camiones

Usá una instancia local conectada a una base de prueba. Configurá `TELEMETRIA_URL` con la URL local de la API y `TELEMETRIA_TOKEN` con el mismo valor del backend. Definí `DEMO_ADMIN_EMAIL` y `DEMO_ADMIN_PASSWORD` con una cuenta de administración de prueba, y `DEMO_VECINO_PASSWORD` con la contraseña que usará la cuenta vecinal de demo. Desde `backend/`, ejecutá el script con esas variables ya cargadas.

```sh
node scripts/demo-recoleccion.mjs
```

El script crea o reutiliza **Demo Ciudad Limpia · Roca**, dos camiones activos y `demo-recoleccion@ciudadlimpia.test` con el domicilio **Casa demo**. Envía cinco muestras por camión, una cada cinco segundos, y comprueba la respuesta de la API después de cada muestra. Cada ejecución crea dos prestaciones nuevas. El script imprime el endpoint para Swagger y las posiciones, y termina con error si falta un camión o su posición no avanza.

Si ya está preparada la instancia aislada en el puerto 3101, desde `backend/` se puede repetir la demo con `node --env-file=.tmp/demo/.env scripts/demo-recoleccion.mjs`. En Swagger, iniciá sesión con el vecino de prueba mientras corre el script y consultá la ruta que imprime. Para esta demo, mantené el envío push real deshabilitado.
