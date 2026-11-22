import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { setTimeout as esperar } from 'node:timers/promises';

const [archivo, camionId, trayectoIngresado, servicioId = randomUUID()] =
  process.argv.slice(2);
const token = process.env.TELEMETRIA_TOKEN;
const base = process.env.TELEMETRIA_URL || 'http://localhost:3000';
const uuid = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
if (
  !archivo ||
  !token ||
  ![camionId, servicioId].every((id) => uuid.test(id || ''))
) {
  throw new Error(
    'Uso: node scripts/mock-telemetria.mjs archivo.json camionId [trayectoId] [servicioId], con TELEMETRIA_TOKEN configurado',
  );
}

const contenido = JSON.parse(
  (await readFile(archivo, 'utf8')).replace(/^\uFEFF/, ''),
);
let datos = contenido;
if (
  Array.isArray(contenido) &&
  contenido[0]?.geometria?.type === 'LineString'
) {
  datos = trayectoIngresado
    ? contenido.find(({ id }) => id === trayectoIngresado)
    : contenido.length === 1
      ? contenido[0]
      : undefined;
  if (!datos)
    throw new Error(
      'El archivo contiene un listado de trayectos. Usá el detalle de uno o indicá su ID como tercer argumento.',
    );
}
const linea = datos?.geometria ?? datos;
const esTrayecto = linea?.type === 'LineString';
const trayectoId = trayectoIngresado ?? datos?.id;
const coordenadas = esTrayecto ? linea.coordinates : datos;
if (!uuid.test(trayectoId ?? '') || (datos?.id && datos.id !== trayectoId)) {
  throw new Error(
    'Indicá el ID del trayecto o usá la respuesta completa del endpoint de detalle.',
  );
}
if (
  !Array.isArray(coordenadas) ||
  !coordenadas.length ||
  coordenadas.some(
    (par) =>
      !Array.isArray(par) ||
      par.length !== 2 ||
      !par.every(Number.isFinite) ||
      Math.abs(par[0]) > 180 ||
      Math.abs(par[1]) > 90,
  )
)
  throw new Error(
    'El archivo debe contener una LineString o una lista de posiciones [longitud, latitud].',
  );

function muestrear(linea) {
  const intervaloM = 60;
  const metrosPorGrado = (Math.PI * 6371008.8) / 180;
  const muestras = [linea[0]];
  let hastaSiguiente = intervaloM;
  let distanciaRecorrida = 0;

  for (let i = 1; i < linea.length; i++) {
    const [long, lat] = linea[i - 1];
    const [longFin, latFin] = linea[i];
    const dx = longFin - long;
    const dy = latFin - lat;
    const distancia =
      metrosPorGrado *
      Math.hypot(dx * Math.cos(((lat + latFin) * Math.PI) / 360), dy);
    distanciaRecorrida += distancia;
    while (hastaSiguiente <= distancia) {
      const proporcion = hastaSiguiente / distancia;
      muestras.push([long + dx * proporcion, lat + dy * proporcion]);
      hastaSiguiente += intervaloM;
    }
    hastaSiguiente -= distancia;
  }

  if (distanciaRecorrida === 0)
    throw new Error(
      'La LineString debe contener al menos dos posiciones distintas.',
    );
  const [long, lat] = linea.at(-1);
  const [ultimaLong, ultimaLat] = muestras.at(-1);
  if (long !== ultimaLong || lat !== ultimaLat) muestras.push([long, lat]);
  return muestras;
}

const posiciones = esTrayecto ? muestrear(coordenadas) : coordenadas;

console.log(
  `Prestación ${servicioId} · ${posiciones.length} posiciones para un camión`,
);
for (const [indice, [long, lat]] of posiciones.entries()) {
  if (indice) await esperar(5000);
  const respuesta = await fetch(new URL('/api/telemetria/posiciones', base), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      servicioId,
      camionId,
      trayectoId,
      registradoEn: new Date().toISOString(),
      lat,
      long,
      precisionM: 5,
    }),
    signal: AbortSignal.timeout(5000),
    redirect: 'error',
  });
  if (!respuesta.ok)
    throw new Error(
      `La posición ${indice + 1} recibió HTTP ${respuesta.status}`,
    );
  console.log(
    `Posición ${indice + 1}/${posiciones.length} · ${long.toFixed(6)}, ${lat.toFixed(6)}`,
  );
}
