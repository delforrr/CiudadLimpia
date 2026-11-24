# Pruebas de aprobación de la rama

Usá una base PostgreSQL 17 de prueba y una cuenta de administrador. La migración agrega Zona Urbana, Ampliación Urbana y Zona de Quintas. Si la base ya tiene trayectos creados antes de esta rama, usá una base vacía para probar. Para desplegar sobre esa base existente, prepará primero un mapa verificado de trayecto a zona. La migración detecta esos registros y frena sin borrar datos.

## Qué probar en la aplicación

| Cambio | Acciones | Resultado esperado |
|---|---|---|
| Puntos Limpios | Como admin, creá un tipo con dos materiales, ícono y color. Creá un punto con calle, altura y pin. Recargá y abrilo en otro navegador. | El punto, su dirección, el color y los materiales persisten. Al marcarlo inactivo desaparece del mapa público y sigue en el panel. |
| Zonas | Entrá en **Trayectos y zonas**. Revisá las tres zonas iniciales. Creá una zona, renombrala y probá el mismo nombre con cambios de mayúsculas o tildes. | El listado se comparte entre sesiones. El nombre equivalente se rechaza y el formulario conserva los datos si falla el guardado. |
| Trayectos | Intentá guardar sin zona. Elegí una, confirmá dos puntos distintos y asigná calle a cada tramo. Guardá, recargá y cambiá de zona. Intentá borrar la zona que quedó en uso. | Guardar sin zona falla. La zona elegida y el trazado persisten juntos. Borrar una zona en uso se bloquea. |
| Editor y mapas | Dividí un tramo confirmado. Cambiá un punto mientras está pendiente una sugerencia de trazado. Abrí el mapa público y el de Hoy también en móvil. | El corte conserva calle y lado. Mover un punto invalida la cobertura previa y una sugerencia vieja queda descartada. Los mapas muestran marcadores y atribución. |
| Domicilios | Guardá dos domicilios como vecino. Elegí el segundo en **Hoy**. Iniciá sesión en otro navegador. Desde administración corregí el pin, recargá el perfil y quitá el domicilio elegido. | Se recupera la preferencia de la cuenta y el pin actualizado. Al quitar el domicilio elegido, Hoy muestra el primero disponible. |
| Web Push | Con VAPID configurado y permiso habilitado, activá la campana en **Hoy**. Recargá en el mismo navegador, elegí otro domicilio y activá de nuevo. Probá denegar el permiso en otro navegador. | El estado vuelve desde la API. Cambiar de domicilio conserva el vínculo anterior hasta activar explícitamente el nuevo. Denegar informa el problema. |
| Permisos y proxy | Abrí la aplicación con Vite y con Compose. Consultá `/puntos-limpios`, `/api/puntos-limpios` y `/api/tipos-punto-limpio`. Intentá acceder al catálogo administrativo o a las zonas desde una cuenta común. | La página devuelve HTML y los endpoints públicos, JSON. Los endpoints administrativos rechazan la sesión sin rol. |

## Verificación automática

En `backend/`, con `TEST_DATABASE_URL` apuntando a la base descartable ya migrada:

```sh
npm run prisma:generate
npx eslint src test --max-warnings=0
npx tsc --noEmit
npm test -- --runInBand
npm run test:e2e -- --runInBand
npm run build
npm run audit
```

En `frontend/`:

```sh
npx eslint . --max-warnings=0
npx tsc -b
npm test
npm run build
```

Antes de aprobar, verificá que las pruebas de PostgreSQL se ejecutaron. Jest las omite cuando falta `TEST_DATABASE_URL`.
