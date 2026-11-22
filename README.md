# Ciudad Limpia

Ciudad Limpia reúne el calendario de recolección, el mapa de Puntos Limpios y el seguimiento de camiones recolectores de Trenque Lauquen. Sirve para saber qué residuos sacar y dónde llevar los reciclables.

## Qué podés hacer

- **Calendario:** consultá los días de recolección de residuos reciclables y no reciclables.
- **Puntos Limpios:** explorá el mapa, filtrá por tipo de punto y revisá qué materiales recibe cada uno.
- **Recolección en vivo:** iniciá sesión, guardá un domicilio y consultá el recorrido y la ubicación de los camiones activos cuando haya datos disponibles.
- **Administración:** gestioná puntos limpios, recorridos, flota y cuentas desde el panel con permisos de administrador.

## Pantallas

Capturas de la app con datos de ejemplo. [Cartografía de OpenStreetMap](https://www.openstreetmap.org/copyright).

| Calendario | Puntos Limpios | Recolección en vivo |
| --- | --- | --- |
| ![Calendario de recolección en la app](docs/capturas/calendario.png) | ![Mapa de Puntos Limpios con una ficha de materiales abierta](docs/capturas/puntos-limpios.png) | ![Recorrido y ubicación de un camión para un domicilio de ejemplo](docs/capturas/recoleccion.png) |

## Cómo levantar la app

Necesitás Node.js 24.15 o superior de la línea 24, o Node.js 26 en adelante, y npm 11.17.0.

Creá `backend/.env` a partir de [`backend/.env.example`](backend/.env.example) y guardá un valor aleatorio propio en `JWT_SECRET`. Podés generarlo con este comando.

```sh
node -p "require('node:crypto').randomBytes(32).toString('hex')"
```

### Opción A · Supabase

1. Creá un proyecto dedicado y desactivá **Data API** en su configuración. Ciudad Limpia se conecta directamente a PostgreSQL. [Configuración de Data API](https://supabase.com/docs/guides/api/securing-your-api#disable-the-data-api)
2. En **Connect**, copiá la URI de **Session pooler** a `DATABASE_URL` en `backend/.env`. Reemplazá el marcador de contraseña por la contraseña de la base y agregá `?sslmode=require` al final de la URI. Si ya tiene parámetros, usá `&sslmode=require`. [Conexión a PostgreSQL en Supabase](https://supabase.com/docs/guides/database/connecting-to-postgres)

### Opción B · PostgreSQL local

Con Docker y Compose, definí `POSTGRES_PASSWORD` en `backend/.env` y usá la misma contraseña en `DATABASE_URL`. Desde la raíz del repositorio, ejecutá:

```sh
docker compose --env-file backend/.env up -d --wait postgres
```

Si ya tenés PostgreSQL 17, creá una base vacía y usá su conexión en `DATABASE_URL`. En ambas opciones, si la contraseña contiene caracteres reservados de una URL, codificalos en la URI.

### Iniciar la aplicación

En una terminal, desde la raíz del repositorio:

```sh
cd backend
npm ci
npm run prisma:generate
npm run prisma:migrate
npm run start:dev
```

En otra terminal, también desde la raíz:

```sh
cd frontend
npm ci
npm run dev
```

Abrí [http://localhost:5173](http://localhost:5173).

## Primeros pasos

Abrí **Calendario** para consultar la recolección sin crear una cuenta. Para usar **Hoy**, registrate y agregá tu domicilio en **Mi perfil**. Una instalación nueva muestra marcadores y recorridos a medida que se cargan los datos correspondientes.
