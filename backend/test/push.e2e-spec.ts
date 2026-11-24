import { createECDH, randomBytes, randomUUID } from 'node:crypto';
import { debeAvisar } from '../src/push/push.service';
import {
  describePostgres,
  posicion,
  prepararRecoleccion,
} from './recoleccion-fixture';

it('aplica la ventana longitudinal y exige avance', () => {
  const progreso = {
    metros: 900,
    avanza: true,
    registradoEn: new Date(),
    posicion: posicion(0),
  };
  expect(debeAvisar([1200], progreso)).toBe(true);
  expect(debeAvisar([1201], progreso)).toBe(false);
  expect(debeAvisar([900], progreso)).toBe(false);
  expect(debeAvisar([1180], { ...progreso, avanza: false })).toBe(false);
  expect(debeAvisar([850, 1180], progreso)).toBe(true);
});

describePostgres('Suscripciones y entregas push (HTTP y PostgreSQL)', () => {
  let f: Awaited<ReturnType<typeof prepararRecoleccion>>;
  const llaves = createECDH('prime256v1');
  const keys = {
    p256dh: llaves.generateKeys().toString('base64url'),
    auth: randomBytes(16).toString('base64url'),
  };
  const endpoint = `https://fcm.googleapis.com/fcm/send/${randomUUID()}`;
  let suscripcionId: string;

  beforeAll(async () => {
    f = await prepararRecoleccion(true);
  });
  afterAll(async () => {
    await f?.cerrar();
  });

  const guardar = (direccionId: string, url = endpoint, token = f.vecino) =>
    f
      .api()
      .put('/api/push/suscripciones')
      .set('Authorization', token)
      .send({ direccionId, endpoint: url, keys });
  const suscripcion = () => `/api/push/suscripciones/${suscripcionId}`;

  async function avanzar(x: number, camionId = f.camiones[0].id) {
    const servicioId = randomUUID();
    const ahora = Date.now();
    await f
      .gps(
        f.muestra(x - 50, {
          servicioId,
          camionId,
          registradoEn: new Date(ahora - 5000).toISOString(),
        }),
      )
      .expect(204);
    const segunda = f.muestra(x, {
      servicioId,
      camionId,
      registradoEn: new Date(ahora).toISOString(),
    });
    await Promise.all([f.gps(segunda).expect(204), f.gps(segunda).expect(204)]);
    return f.prisma.servicioRecoleccion.findFirstOrThrow({
      where: { servicioId },
    });
  }

  it('vincula un domicilio propio y rechaza endpoints o cuentas ajenas', async () => {
    await f
      .api()
      .get('/api/push/configuracion')
      .set('Authorization', f.vecino)
      .expect(200, { clavePublica: 'vapid-publica-de-prueba' });
    for (const url of [
      'https://127.0.0.1/push',
      'https://fcm.googleapis.com.example.test/fcm/send/token',
      'https://fcm.googleapis.com:444/fcm/send/token',
    ]) {
      await guardar(f.domicilios[0].id, url).expect(400);
    }
    await guardar(f.domicilios[0].id, endpoint, f.otro).expect(404);
    const respuesta = await guardar(f.domicilios[0].id).expect(200);
    suscripcionId = (respuesta.body as { id: string }).id;
    await guardar(f.domicilios[0].id).expect(200, respuesta.body as object);
    await f.api().get(suscripcion()).set('Authorization', f.otro).expect(404);
    const estado = () =>
      f.api().post('/api/push/suscripciones/estado').send({ endpoint });
    await estado().expect(401);
    await estado()
      .set('Authorization', f.otro)
      .expect(200, { suscripcion: null });
    await estado()
      .set('Authorization', f.vecino)
      .expect(200, {
        suscripcion: { id: suscripcionId, direccionId: f.domicilios[0].id },
      });
    await f
      .api()
      .delete(suscripcion())
      .set('Authorization', f.otro)
      .set('Content-Type', 'application/json')
      .expect(404);
  });

  it('da dos posiciones y dos entregas en la esquina, una por prestación', async () => {
    const a = await avanzar(320);
    const estadoAvisos = `/api/telemetria/servicios/${a.servicioId}/avisos`;
    await f.api().get(estadoAvisos).expect(401);
    await f
      .api()
      .get(estadoAvisos)
      .set('Authorization', 'Bearer gps-test-token')
      .expect(200, {
        habilitado: true,
        pendientes: 1,
        enviados: 0,
        cancelados: 0,
      });
    const b = await avanzar(330, f.camiones[1].id);
    const servicioId = randomUUID();
    const paso = (y: number, registradoEn: string) =>
      f.muestra(0, {
        ...posicion(600, y),
        camionId: f.camiones[2].id,
        trayectoId: f.transversal.id,
        servicioId,
        registradoEn,
      });
    const ahora = Date.now();
    await f.gps(paso(-90, new Date(ahora - 5000).toISOString())).expect(204);
    await f.gps(paso(-20, new Date(ahora).toISOString())).expect(204);
    const respuesta = await f.mapa().expect(200);
    expect((respuesta.body as { camiones: unknown[] }).camiones).toHaveLength(
      2,
    );
    await Promise.all([
      f.despachador.despacharPendientes(new Date()),
      f.despachador.despacharPendientes(new Date()),
    ]);
    expect(f.enviar).toHaveBeenCalledTimes(2);
    await f
      .api()
      .get(estadoAvisos)
      .set('Authorization', 'Bearer gps-test-token')
      .expect(200, {
        habilitado: true,
        pendientes: 0,
        enviados: 1,
        cancelados: 0,
      });
    const entregas = await f.prisma.entregaPush.findMany({
      where: { suscripcionId },
    });
    expect(entregas.map(({ prestacionId }) => prestacionId).sort()).toEqual(
      [a.id, b.id].sort(),
    );
    expect(entregas.every(({ estado }) => estado === 'ENVIADO')).toBe(true);
    expect(new Set(f.enviar.mock.calls.map(([, id]) => id)).size).toBe(2);
  });

  it('reintenta un fallo transitorio con el mismo ID e invalida pendientes al cambiar domicilio', async () => {
    f.enviar.mockClear().mockResolvedValueOnce(503);
    const { id } = await avanzar(340);
    const entrega = await f.prisma.entregaPush.findFirstOrThrow({
      where: { prestacionId: id },
    });
    await f.despachador.despacharPendientes(new Date());
    await f.prisma.entregaPush.update({
      where: { id: entrega.id },
      data: { proximoIntentoEn: new Date(Date.now() - 1000) },
    });
    await Promise.all([
      f.despachador.despacharPendientes(new Date()),
      f.despachador.despacharPendientes(new Date()),
    ]);
    expect(f.enviar.mock.calls.map(([, id]) => id)).toEqual([
      entrega.id,
      entrega.id,
    ]);
    const pendiente = await avanzar(350);
    await guardar(f.domicilios[1].id).expect(200, {
      id: suscripcionId,
      direccionId: f.domicilios[1].id,
    });
    const estado = await f.prisma.entregaPush.findFirstOrThrow({
      where: { prestacionId: pendiente.id },
    });
    expect(estado.estado).toBe('CANCELADO');
    await f.despachador.despacharPendientes(new Date());
    expect(f.enviar).toHaveBeenCalledTimes(2);
    await f
      .gps(
        f.muestra(430, {
          servicioId: pendiente.servicioId,
          registradoEn: new Date(
            pendiente.muestraEn.getTime() + 5000,
          ).toISOString(),
        }),
      )
      .expect(204);
    await f.despachador.despacharPendientes(new Date());
    expect(f.enviar).toHaveBeenCalledTimes(3);
    expect(f.enviar.mock.calls.at(-1)?.[1]).toBe(estado.id);
  });

  it('conserva la entrega pendiente mientras el camión está detenido', async () => {
    f.enviar.mockClear();
    const prestacion = await avanzar(420);
    const siguiente = (x: number, segundos: number) =>
      f.gps(
        f.muestra(x, {
          servicioId: prestacion.servicioId,
          registradoEn: new Date(
            prestacion.muestraEn.getTime() + segundos * 1000,
          ).toISOString(),
        }),
      );
    await siguiente(420, 1).expect(204);
    await f.despachador.despacharPendientes(new Date());
    expect(f.enviar).not.toHaveBeenCalled();
    const pendiente = await f.prisma.entregaPush.findFirstOrThrow({
      where: { prestacionId: prestacion.id },
    });
    expect(pendiente.estado).toBe('PENDIENTE');
    await siguiente(460, 4).expect(204);
    await f.prisma.entregaPush.update({
      where: { id: pendiente.id },
      data: { proximoIntentoEn: new Date(Date.now() - 1000) },
    });
    await f.despachador.despacharPendientes(new Date());
    expect(f.enviar.mock.calls.map(([, id]) => id)).toEqual([pendiente.id]);
  });

  it('omite un envío vencido y elimina la suscripción si el proveedor responde 410', async () => {
    f.enviar.mockClear().mockResolvedValueOnce(410);
    const vencida = await avanzar(440);
    await f.prisma.entregaPush.updateMany({
      where: { prestacionId: vencida.id },
      data: { venceEn: new Date(Date.now() - 1000) },
    });
    await f.despachador.despacharPendientes(new Date());
    expect(f.enviar).not.toHaveBeenCalled();
    await avanzar(450);
    await f.despachador.despacharPendientes(new Date());
    expect(f.enviar).toHaveBeenCalledTimes(1);
    await f.api().get(suscripcion()).set('Authorization', f.vecino).expect(404);
  });

  it('conserva el endpoint al editar etiquetas y lo elimina al desvincular el frente', async () => {
    const respuesta = await guardar(f.domicilios[0].id).expect(200);
    const url = `/api/push/suscripciones/${(respuesta.body as { id: string }).id}`;
    const editar = (domicilios: { direccionId: string; etiqueta?: string }[]) =>
      f
        .api()
        .patch(`/users/${f.vecinoId}`)
        .set('Authorization', f.vecino)
        .send({ cliente: { name: 'Ana', lastName: 'Pérez', domicilios } });
    await editar(
      f.domicilios.map(({ id }) => ({ direccionId: id, etiqueta: 'Casa' })),
    ).expect(200);
    await f.api().get(url).set('Authorization', f.vecino).expect(200);
    await editar([{ direccionId: f.domicilios[1].id }]).expect(200);
    await f.api().get(url).set('Authorization', f.vecino).expect(404);
  });
});
