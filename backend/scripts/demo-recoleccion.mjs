import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { setTimeout as esperar } from 'node:timers/promises';

const base = new URL(process.env.TELEMETRIA_URL || 'http://127.0.0.1:3101');
if (
  !['localhost', '127.0.0.1', '[::1]'].includes(base.hostname) ||
  !['http:', 'https:'].includes(base.protocol)
) {
  throw new Error('La demo solo se ejecuta contra una API local.');
}

const token = process.env.TELEMETRIA_TOKEN;
if (!token) throw new Error('Definí TELEMETRIA_TOKEN.');

const carpetaDemo = new URL('../.tmp/demo/', import.meta.url);
const archivoDemo = new URL('recorrido.json', carpetaDemo);
const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
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
  if (!respuesta.ok) {
    const espera = respuesta.headers.get('Retry-After');
    throw new Error(
      `${metodo} ${ruta} devolvió HTTP ${respuesta.status}.` +
        (respuesta.status === 429 && espera
          ? ` Podés reintentar en ${espera} s.`
          : ''),
    );
  }
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

async function leerDemo() {
  try {
    const datos = JSON.parse(await readFile(archivoDemo, 'utf8'));
    if (datos.origen !== base.origin) return null;
    assert(
      uuid.test(datos.trayectoId) &&
        uuid.test(datos.domicilioId) &&
        Array.isArray(datos.camiones) &&
        datos.camiones.length === 2 &&
        datos.camiones.every(
          ({ id, patente }) => uuid.test(id) && typeof patente === 'string',
        ),
    );
    return datos;
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw new Error(
      'No se pudo leer el recorrido guardado. Ejecutá la demo con --preparar para regenerarlo.',
    );
  }
}

async function prepararDemo() {
  const emailAdmin = process.env.DEMO_ADMIN_EMAIL;
  const passwordAdmin = process.env.DEMO_ADMIN_PASSWORD;
  const passwordVecino = process.env.DEMO_VECINO_PASSWORD;
  if (!emailAdmin || !passwordAdmin || !passwordVecino) {
    throw new Error(
      'Para preparar la demo definí DEMO_ADMIN_EMAIL, DEMO_ADMIN_PASSWORD y DEMO_VECINO_PASSWORD.',
    );
  }
  if (passwordVecino.length < 8 || Buffer.byteLength(passwordVecino) > 72) {
    throw new Error(
      'DEMO_VECINO_PASSWORD debe tener al menos 8 caracteres y hasta 72 bytes.',
    );
  }

  const admin = await login(emailAdmin, passwordAdmin);
  assert(
    admin.cookie && admin.datos.role === 'ADMIN',
    'La cuenta de configuración debe ser ADMIN.',
  );
  const cookie = admin.cookie;

  const { datos: trayectos } = await solicitar('/api/trayectos', { cookie });
  const { datos: calles } = await solicitar(
    `/calles?buscar=${encodeURIComponent(calle)}`,
    { cookie },
  );
  const calleDemo =
    calles.find((item) => item.calle === calle) ??
    (await solicitar('/calles', { metodo: 'POST', cookie, cuerpo: { calle } }))
      .datos;
  const trayecto =
    trayectos.find((item) => item.nombre === nombre) ??
    (
      await solicitar('/api/trayectos', {
        metodo: 'POST',
        cookie,
        cuerpo: {
          nombre,
          localidadId: '06826050',
          geometria,
          puntos,
          tramos: [{ desde: 0, hasta: 1, calleId: calleDemo.id }],
        },
      })
    ).datos;
  assert.deepEqual(
    trayecto.geometria,
    geometria,
    'La geometría del trayecto de demo existente fue modificada.',
  );
  if (!trayecto.tramos?.length) {
    await solicitar(`/api/trayectos/${trayecto.id}`, {
      metodo: 'PATCH',
      cookie,
      cuerpo: {
        nombre,
        localidadId: '06826050',
        geometria,
        puntos,
        tramos: [{ desde: 0, hasta: 1, calleId: calleDemo.id }],
      },
    });
  }

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
    camiones.push({ id: camion.id, patente });
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
  return {
    configuracion: {
      origen: base.origin,
      trayectoId: trayecto.id,
      domicilioId: domicilio.id,
      camiones,
    },
    cookie: vecino.cookie,
  };
}

async function demo() {
  const guardada = process.argv.includes('--preparar')
    ? null
    : await leerDemo();
  const { configuracion, cookie } = guardada
    ? { configuracion: guardada }
    : await prepararDemo();
  const { trayectoId, domicilioId } = configuracion;
  const camiones = configuracion.camiones.map((camion) => ({
    ...camion,
    servicioId: randomUUID(),
  }));
  const mapa = `/api/hoy/domicilios/${domicilioId}/mapa`;
  console.log(`Trayecto: ${nombre} (${trayectoId})`);
  console.log(`Vecino: ${emailVecino}`);
  console.log(`Consulta para Swagger: GET ${mapa}`);
  if (guardada) console.log('Reproduciendo el recorrido guardado.');

  let posicionesAnteriores;
  for (let paso = 0; paso < 5; paso++) {
    if (paso) await esperar(5000);
    const registradoEn = new Date().toISOString();
    const muestras = camiones.map(({ id: camionId, servicioId }, indice) => ({
      camionId,
      servicioId,
      trayectoId,
      ...posicion(200 - 80 * indice + 70 * paso),
      registradoEn,
      precisionM: 5,
    }));
    await Promise.all(
      muestras.map((cuerpo) =>
        solicitar('/api/telemetria/posiciones', {
          metodo: 'POST',
          bearer: token,
          cuerpo,
        }),
      ),
    );
    const posiciones = muestras.map(({ long }) => long);
    if (cookie) {
      const { datos } = await solicitar(mapa, { cookie });
      assert(
        datos.trayectos.some(({ id }) => id === trayectoId),
        'La consulta no encontró el trayecto de demo.',
      );
      for (const { id, patente } of camiones) {
        assert(
          datos.camiones.some(
            (item) =>
              item.camionId === id && item.registradoEn === registradoEn,
          ),
          `La consulta no devolvió la nueva posición de ${patente}.`,
        );
      }
    }
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
  if (!guardada) {
    await mkdir(carpetaDemo, { recursive: true });
    await writeFile(archivoDemo, `${JSON.stringify(configuracion, null, 2)}\n`);
  }
}

try {
  await demo();
} catch (error) {
  console.error(`Demo: ${error.message}`);
  process.exitCode = 1;
}
