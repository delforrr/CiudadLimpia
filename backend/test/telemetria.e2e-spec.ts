import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import {
  describePostgres,
  posicion,
  prepararRecoleccion,
} from './recoleccion-fixture';

describePostgres('Telemetría (HTTP y PostgreSQL)', () => {
  let f: Awaited<ReturnType<typeof prepararRecoleccion>>;
  beforeAll(async () => {
    f = await prepararRecoleccion();
  });
  afterAll(async () => {
    await f?.cerrar();
  });

  it('valida credencial, DTO, referencias e identidad estable de la prestación', async () => {
    const muestra = f.muestra(250);
    await f.gps(muestra, 'incorrecto').expect(401);
    await f
      .gps({ ...muestra, registradoEn: '2026-11-22T12:00:00' })
      .expect(400);
    await f.gps({ ...muestra, lat: 100 }).expect(400);
    await f.gps({ ...muestra, camionId: randomUUID() }).expect(404);
    await f.gps({ ...muestra, trayectoId: randomUUID() }).expect(404);
    await f.gps(muestra).expect(204);
    await f.gps({ ...muestra, camionId: f.camiones[1].id }).expect(409);
  });

  it('serializa duplicados, ignora muestras anteriores e invalida el marcador fuera de línea', async () => {
    const base = Date.now();
    const primera = f.muestra(250, {
      registradoEn: new Date(base - 10000).toISOString(),
    });
    const segunda = f.muestra(320, {
      servicioId: primera.servicioId,
      registradoEn: new Date(base - 5000).toISOString(),
    });
    await Promise.all([f.gps(primera).expect(204), f.gps(primera).expect(204)]);
    await f.gps(segunda).expect(204);
    await f.gps(primera).expect(204);
    await f
      .gps({ ...segunda, registradoEn: new Date(base - 31_000).toISOString() })
      .expect(204);
    const actual = () =>
      f.prisma.servicioRecoleccion.findFirstOrThrow({
        where: { servicioId: primera.servicioId },
      });
    expect((await actual()).progreso).toMatchObject({
      avanza: true,
      registradoEn: segunda.registradoEn,
    });
    await f
      .gps({
        ...segunda,
        ...posicion(350, 100),
        registradoEn: new Date(base).toISOString(),
      })
      .expect(204);
    expect((await actual()).visibleHasta).toBeNull();
  });

  it('rechaza el camión inactivo', async () => {
    const camionId = f.camiones[2].id;
    await f.prisma.camion.update({
      where: { id: camionId },
      data: { estado: 'INACTIVO' },
    });
    try {
      await f.gps(f.muestra(250, { camionId })).expect(404);
    } finally {
      await f.prisma.camion.update({
        where: { id: camionId },
        data: { estado: 'ACTIVO' },
      });
    }
  });

  it('reproduce el mock real contra la API y conserva la última muestra', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'ciudadlimpia-gps-'));
    try {
      const archivo = join(dir, 'posiciones.json');
      const lugares = [posicion(200), posicion(250)];
      await writeFile(
        archivo,
        JSON.stringify(lugares.map(({ long, lat }) => [long, lat])),
      );
      await f.app.listen(0, '127.0.0.1');
      const servicioId = randomUUID();
      await promisify(execFile)(
        process.execPath,
        [
          'scripts/mock-telemetria.mjs',
          archivo,
          f.camiones[0].id,
          f.trayecto.id,
          servicioId,
        ],
        {
          env: {
            ...process.env,
            TELEMETRIA_TOKEN: 'gps-test-token',
            TELEMETRIA_URL: await f.app.getUrl(),
          },
          timeout: 12_000,
        },
      );
      const guardada = await f.prisma.servicioRecoleccion.findFirstOrThrow({
        where: { servicioId },
      });
      expect(guardada.progreso).toMatchObject({
        posicion: lugares[1],
        avanza: true,
      });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 15_000);
});
