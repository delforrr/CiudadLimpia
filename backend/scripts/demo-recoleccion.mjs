import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { setTimeout as esperar } from 'node:timers/promises';

const base = new URL(process.env.TELEMETRIA_URL || 'http://127.0.0.1:3101');
if (
  !['localhost', '127.0.0.1', '[::1]'].includes(base.hostname) ||
  !['http:', 'https:'].includes(base.protocol)
) {
  throw new Error('La demo solo se ejecuta contra una API local.');
}

const emailAdmin = process.env.DEMO_ADMIN_EMAIL;
const passwordAdmin = process.env.DEMO_ADMIN_PASSWORD;
const passwordVecino = process.env.DEMO_VECINO_PASSWORD;
const token = process.env.TELEMETRIA_TOKEN;
if (!emailAdmin || !passwordAdmin || !passwordVecino || !token) {
  throw new Error(
    'Definí DEMO_ADMIN_EMAIL, DEMO_ADMIN_PASSWORD, DEMO_VECINO_PASSWORD y TELEMETRIA_TOKEN.',
  );
}
if (passwordVecino.length < 8 || Buffer.byteLength(passwordVecino) > 72) {
  throw new Error(
    'DEMO_VECINO_PASSWORD debe tener al menos 8 caracteres y hasta 72 bytes.',
  );
}

const nombre = 'Demo Ciudad Limpia · Roca';
const calle = 'Roca Demo Ciudad Limpia';
const emailVecino = 'demo-recoleccion@ciudadlimpia.test';
const posicion = (metros) => ({ lat: -35.971, long: -62.739 + metros / 90000 });
const geometria = {
  type: 'LineString',
  coordinates: [posicion(0), posicion(850)].map(({ long, lat }) => [long, lat]),
};
const puntos = [0, 850].map((metros, orden) => ({
  orden,
  ...posicion(metros),
  direccion: { calle, altura: orden ? 900 : 100 },
}));

async function solicitar(
  ruta,
  { metodo = 'GET', cuerpo, cookie, bearer } = {},
) {
  const respuesta = await fetch(new URL(ruta, base), {
    method: metodo,
    headers: {
      ...(cuerpo && { 'Content-Type': 'application/json' }),
      ...(cookie && { Cookie: cookie }),
      ...(bearer && { Authorization: `Bearer ${bearer}` }),
    },
    body: cuerpo && JSON.stringify(cuerpo),
    redirect: 'error',
    signal: AbortSignal.timeout(10000),
  });
  if (!respuesta.ok)
    throw new Error(`${metodo} ${ruta} devolvió HTTP ${respuesta.status}.`);
  return {
    datos: respuesta.status === 204 ? null : await respuesta.json(),
    cookie: respuesta.headers
      .getSetCookie()
      .find((valor) => valor.startsWith('session='))
      ?.split(';')[0],
  };
}

const login = (email, password) =>
  solicitar('/auth/login', { metodo: 'POST', cuerpo: { email, password } });

async function demo() {
  const admin = await login(emailAdmin, passwordAdmin);
  assert(
    admin.cookie && admin.datos.role === 'ADMIN',
    'La cuenta de configuración debe ser ADMIN.',
  );
  const cookie = admin.cookie;

  const { datos: trayectos } = await solicitar('/api/trayectos', { cookie });
  const trayecto =
    trayectos.find((item) => item.nombre === nombre) ??
    (
      await solicitar('/api/trayectos', {
        metodo: 'POST',
        cookie,
        cuerpo: { nombre, localidadId: '06826050', geometria, puntos },
      })
    ).datos;
  assert.deepEqual(
    trayecto.geometria,
    geometria,
    'La geometría del trayecto de demo existente fue modificada.',
  );

  const { datos: flota } = await solicitar('/api/camiones', { cookie });
  const camiones = [];
  for (const numero of ['01', '02']) {
    const patente = `DEMO-CL-${numero}`;
    const camion =
      flota.find((item) => item.patente === patente) ??
      (
        await solicitar('/api/camiones', {
          metodo: 'POST',
          cookie,
          cuerpo: {
            patente,
            marca: 'Demo Ciudad Limpia',
            modelo: `Camión ${numero}`,
            anio: 2024,
          },
        })
      ).datos;
    assert.equal(
      camion.estado,
      'ACTIVO',
      `El camión ${patente} debe estar activo.`,
    );
    camiones.push({ ...camion, servicioId: randomUUID() });
  }

  const { datos: usuarios } = await solicitar('/users', { cookie });
  const vecino = usuarios.some(({ email }) => email === emailVecino)
    ? await login(emailVecino, passwordVecino)
    : await solicitar('/auth/register', {
        metodo: 'POST',
        cuerpo: {
          email: emailVecino,
          password: passwordVecino,
          cliente: {
            name: 'Vecino',
            lastName: 'Demo',
            domicilios: [
              {
                direccion: { calle, altura: 550, ...posicion(550) },
                etiqueta: 'Casa demo',
              },
            ],
          },
        },
      });
  const domicilio = vecino.datos.cliente?.domicilios.find(
    (item) => item.etiqueta === 'Casa demo',
  );
  assert(
    vecino.cookie && domicilio,
    'La cuenta de demo debe tener el domicilio Casa demo.',
  );
  const mapa = `/api/hoy/domicilios/${domicilio.id}/mapa`;
  console.log(`Trayecto: ${trayecto.nombre} (${trayecto.id})`);
  console.log(`Vecino: ${emailVecino}`);
  console.log(`Consulta para Swagger: GET ${mapa}`);

  let posicionesAnteriores;
  for (let paso = 0; paso < 5; paso++) {
    if (paso) await esperar(5000);
    const registradoEn = new Date().toISOString();
    await Promise.all(
      camiones.map(({ id: camionId, servicioId }, indice) =>
        solicitar('/api/telemetria/posiciones', {
          metodo: 'POST',
          bearer: token,
          cuerpo: {
            camionId,
            servicioId,
            trayectoId: trayecto.id,
            ...posicion(200 - 80 * indice + 70 * paso),
            registradoEn,
            precisionM: 5,
          },
        }),
      ),
    );
    const { datos } = await solicitar(mapa, { cookie: vecino.cookie });
    assert(
      datos.trayectos.some(({ id }) => id === trayecto.id),
      'La consulta no encontró el trayecto de demo.',
    );
    const posiciones = camiones.map(({ id, patente }) => {
      const camion = datos.camiones.find(
        (item) => item.camionId === id && item.registradoEn === registradoEn,
      );
      assert(
        camion,
        `La consulta no devolvió la nueva posición de ${patente}.`,
      );
      return camion.posicion.long;
    });
    if (posicionesAnteriores) {
      assert(
        posiciones.every((long, indice) => long > posicionesAnteriores[indice]),
        'Las posiciones deben avanzar sobre el recorrido.',
      );
    }
    posicionesAnteriores = posiciones;
    console.log(
      `Muestra ${paso + 1}: dos camiones en avance (${posiciones.map((long) => long.toFixed(6)).join(', ')})`,
    );
  }
}

try {
  await demo();
} catch (error) {
  console.error(`Demo: ${error.message}`);
  process.exitCode = 1;
}
