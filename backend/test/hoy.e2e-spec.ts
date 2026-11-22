import { randomUUID } from 'node:crypto';
import type { MapaHoyResponseDto } from '../src/hoy/hoy.dto';
import {
  describePostgres,
  geometria,
  posicion,
  prepararRecoleccion,
} from './recoleccion-fixture';

describePostgres('Mapa para Hoy (HTTP y PostgreSQL)', () => {
  let f: Awaited<ReturnType<typeof prepararRecoleccion>>;
  beforeAll(async () => {
    f = await prepararRecoleccion();
  });
  afterAll(async () => {
    await f?.cerrar();
  });

  it('exige sesión y domicilio propio, y devuelve listas vacías sin prestaciones', async () => {
    await f
      .api()
      .get(`/api/hoy/domicilios/${f.domicilios[0].id}/mapa`)
      .expect(401);
    await f.mapa(f.domicilios[0].id, f.otro).expect(404);
    await f.mapa(randomUUID()).expect(404);
    await f.mapa('invalido').expect(400);
    await f
      .mapa()
      .expect('Cache-Control', 'no-store')
      .expect(200, {
        domicilio: posicion(600, 5),
        trayectos: [],
        camiones: [],
      });
  });

  it('incluye dos camiones de la misma versión y excluye la transversal de la esquina', async () => {
    await f.gps(f.muestra(320)).expect(204);
    await f.gps(f.muestra(360, { camionId: f.camiones[1].id })).expect(204);
    await f
      .gps(
        f.muestra(600, {
          ...posicion(600, -10),
          trayectoId: f.transversal.id,
          camionId: f.camiones[2].id,
        }),
      )
      .expect(204);
    const respuesta = await f.mapa().expect(200);
    const mapa = respuesta.body as MapaHoyResponseDto;
    expect(mapa.camiones).toHaveLength(2);
    expect(mapa.trayectos).toHaveLength(1);
    expect(
      mapa.camiones.every(
        ({ recorridoId }) => recorridoId === mapa.trayectos[0].recorridoId,
      ),
    ).toBe(true);
  });

  it('distingue versiones en curso, oculta una posición vencida y retira las prestaciones al eliminar', async () => {
    await f.prisma.trayecto.update({
      where: { id: f.trayecto.id },
      data: {
        geometria: {
          ...geometria([
            [0, 0],
            [450, 0],
            [1000, 0],
          ]),
        },
      },
    });
    await f.gps(f.muestra(300)).expect(204);
    const respuesta = await f.mapa().expect(200);
    expect((respuesta.body as MapaHoyResponseDto).trayectos).toHaveLength(2);
    await f.prisma.servicioRecoleccion.updateMany({
      where: { trayectoId: f.trayecto.id },
      data: { visibleHasta: new Date(Date.now() - 1000) },
    });
    await f
      .mapa()
      .expect(200)
      .expect(({ body: resultado }) =>
        expect((resultado as MapaHoyResponseDto).camiones).toEqual([]),
      );
    await f
      .api()
      .delete(`/api/trayectos/${f.trayecto.id}`)
      .set('Authorization', f.admin)
      .set('Content-Type', 'application/json')
      .expect(204);
    expect(
      await f.prisma.servicioRecoleccion.count({
        where: { trayectoId: f.trayecto.id },
      }),
    ).toBe(0);
  });
});
