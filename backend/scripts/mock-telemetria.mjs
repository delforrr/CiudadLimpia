import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { setTimeout as esperar } from 'node:timers/promises';

const [archivo, camionId, trayectoId, servicioId = randomUUID()] =
  process.argv.slice(2);
const token = process.env.TELEMETRIA_TOKEN;
const base = process.env.TELEMETRIA_URL || 'http://localhost:3000';
const uuid = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
if (
  !archivo ||
  !token ||
  ![camionId, trayectoId, servicioId].every((id) => uuid.test(id || ''))
) {
  throw new Error(
    'Uso: TELEMETRIA_TOKEN=<token> node scripts/mock-telemetria.mjs posiciones.json camionId trayectoId [servicioId]',
  );
}

const posiciones = JSON.parse(await readFile(archivo, 'utf8'));
if (
  !Array.isArray(posiciones) ||
  !posiciones.length ||
  posiciones.some(
    (par) =>
      !Array.isArray(par) ||
      par.length !== 2 ||
      !par.every(Number.isFinite) ||
      Math.abs(par[0]) > 180 ||
      Math.abs(par[1]) > 90,
  )
)
  throw new Error(
    'El archivo debe contener una lista de posiciones [longitud, latitud]',
  );

console.log(`Prestación ${servicioId}`);
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
}
