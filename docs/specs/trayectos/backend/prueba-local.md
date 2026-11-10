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
      "direccion": { "calle": "Villegas" }
    },
    {
      "orden": 2,
      "lat": -35.97593898340816,
      "long": -62.7294907782653
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

Guardá el `id` del trayecto y los `direccionId` de sus puntos. En `puntos` se envían campos `lat` y `long`. GeoJSON usa pares `[long, lat]`.

## Casos que deben pasar

| Caso | Resultado esperado |
| --- | --- |
| Roles | `GET /api/trayectos` devuelve `401` sin sesión, `403` con `USER` y `200` con `ADMIN`. |
| Catálogo | `GET /api/localidades` devuelve Trenque Lauquen con ID `06826050`, incluso sin salida a Internet. |
| Alta y reapertura | El alta devuelve `201`. El listado contiene el trayecto. El detalle devuelve el mismo nombre, línea y pines en orden. Las referencias incluyen la dirección con altura, la calle sin altura y el pin sin calle. |
| Referencias públicas | Una segunda alta con la misma calle y altura reutiliza el `direccionId`, aunque cambien las coordenadas confirmadas. Dos pines distintos en una misma calle sin altura tienen IDs distintos. Un `direccionId` de un domicilio privado devuelve `400`. |
| Entrada inválida | Un nombre vacío, localidad desconocida, orden repetido, coordenadas fuera de rango o una línea con todas las posiciones iguales devuelve `400`. |
| Edición | Enviá el cuerpo completo con `PATCH /api/trayectos/{id}`. Conservá cada `direccionId` y omití `direccion` cuando reuses una referencia. Cambiá el nombre, reordená los puntos actualizando `orden` y enviá la línea revisada. El detalle conserva el ID y devuelve la versión nueva. Repetí el `PATCH` con una línea inválida y comprobá que el detalle sigue devolviendo la versión anterior. |
| GeoRef | `GET /api/geocodificacion/directa?calle=Villegas&altura=860` ofrece una ubicación aproximada cuando hay datos. `GET /api/geocodificacion/inversa?lat=-35.97&long=-62.73` conserva el pin y puede devolver una calle con `altura: null`. La ausencia de resultado devuelve `sugerencias: []` o `direccionSugerida: null`. Si falla el proveedor, todavía se puede guardar un pin. |

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

Con `TEST_DATABASE_URL` exportada, la suite HTTP verifica en PostgreSQL que un alta o una edición rechazada deja intactos los datos que ya estaban guardados. La aceptación local requiere además que pasen los casos de Swagger con una sesión `ADMIN`.
