import type { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { camionSelect } from '../src/camiones/camiones.select';
import { contratoConductorSelect } from '../src/contrato-conductor/contratos-conductor.select';
import { configureApp } from '../src/configure-app';
import { Estado, Role } from '../src/generated/prisma/enums';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Flota (HTTP)', () => {
  const camionId = '00000000-0000-4000-8000-000000000001';
  const conductorId = '00000000-0000-4000-8000-000000000002';
  const adminId = '00000000-0000-4000-8000-000000000003';
  const usuarioId = '00000000-0000-4000-8000-000000000004';
  const camion = {
    id: camionId,
    patente: 'AB 123 CD',
    marca: 'Mercedes-Benz',
    modelo: 'Atego',
    anio: 2020,
    estado: Estado.ACTIVO,
  };
  const conductor = {
    id: conductorId,
    nombre: 'Juan',
    apellido: 'Pérez',
    activo: true,
  };
  const periodo = {
    idCamion: camionId,
    idConductor: conductorId,
    fechaInicio: '2026-11-21T08:00:00-03:00',
    fechaFin: '2026-11-22T08:00:00-03:00',
  };
  const contrato = {
    ...periodo,
    fechaInicio: new Date(periodo.fechaInicio),
    fechaFin: new Date(periodo.fechaFin),
  };
  const contratoUrl = '/api/contratos-conductor';
  const detalleContratoUrl = `${contratoUrl}/${camionId}/${conductorId}/${encodeURIComponent(periodo.fechaInicio)}`;
  const db = {
    user: { findUnique: jest.fn() },
    camion: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    conductor: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    contratoConductor: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  let app: INestApplication<App>;
  let admin: string;
  let usuario: string;

  beforeAll(async () => {
    process.env.JWT_SECRET = 'test-only-secret-at-least-32-characters';
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(db)
      .compile();
    app = module.createNestApplication();
    configureApp(app);
    await app.init();
    const jwt = app.get(JwtService);
    admin = `Bearer ${await jwt.signAsync({ sub: adminId })}`;
    usuario = `Bearer ${await jwt.signAsync({ sub: usuarioId })}`;
  });

  beforeEach(() => {
    jest.resetAllMocks();
    db.$transaction.mockImplementation(
      (operacion: (tx: typeof db) => unknown) => operacion(db),
    );
    db.user.findUnique.mockImplementation(
      ({ where }: { where: { id: string } }) =>
        where.id === adminId
          ? { id: adminId, role: Role.ADMIN }
          : { id: usuarioId, role: Role.USER },
    );
    db.camion.findUnique.mockResolvedValue(camion);
    db.conductor.findUnique.mockResolvedValue(conductor);
    db.contratoConductor.findFirst.mockResolvedValue(null);
  });

  afterAll(async () => {
    await app.close();
  });

  it('restringe las operaciones a administradores', async () => {
    await request(app.getHttpServer()).get('/api/camiones').expect(401);
    await request(app.getHttpServer())
      .get('/api/conductores')
      .set('Authorization', usuario)
      .expect(403);
    await request(app.getHttpServer()).get(contratoUrl).expect(401);
  });

  it('crea un camión con año y da de baja sin borrar el registro', async () => {
    db.camion.create.mockResolvedValue(camion);
    const api = request(app.getHttpServer());
    const { patente, marca, modelo, anio } = camion;
    await api
      .post('/api/camiones')
      .set('Authorization', admin)
      .send({ patente, marca, modelo })
      .expect(400);
    await api
      .post('/api/camiones')
      .set('Authorization', admin)
      .send({ patente: patente.toLowerCase(), marca, modelo, anio })
      .expect(201)
      .expect(camion);
    expect(db.camion.create).toHaveBeenCalledWith({
      data: { patente, marca, modelo, anio },
      select: camionSelect,
    });

    await api
      .delete(`/api/camiones/${camionId}`)
      .set('Authorization', admin)
      .set('Content-Type', 'application/json')
      .expect(204);
    expect(db.camion.update).toHaveBeenCalledWith({
      where: { id: camionId },
      data: { estado: Estado.INACTIVO },
    });
  });

  it('crea y archiva un conductor', async () => {
    db.conductor.create.mockResolvedValue(conductor);
    const api = request(app.getHttpServer());
    await api
      .post('/api/conductores')
      .set('Authorization', admin)
      .send({ nombre: ' Juan ', apellido: 'Pérez' })
      .expect(201)
      .expect(conductor);
    expect(db.conductor.create).toHaveBeenCalledWith({
      data: { nombre: 'Juan', apellido: 'Pérez' },
    });

    await api
      .delete(`/api/conductores/${conductorId}`)
      .set('Authorization', admin)
      .set('Content-Type', 'application/json')
      .expect(204);
    expect(db.conductor.update).toHaveBeenCalledWith({
      where: { id: conductorId },
      data: { activo: false },
    });
  });

  it('crea y consulta por la clave de tres campos en UTC', async () => {
    db.contratoConductor.create.mockResolvedValue(contrato);
    db.contratoConductor.findUnique.mockResolvedValue(contrato);
    const api = request(app.getHttpServer());
    await api
      .post(contratoUrl)
      .set('Authorization', admin)
      .send(periodo)
      .expect(201);
    expect(db.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: 'Serializable',
    });
    expect(db.contratoConductor.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: contrato }),
    );
    expect(db.contratoConductor.findFirst).toHaveBeenCalledWith({
      where: {
        AND: [
          { OR: [{ idCamion: camionId }, { idConductor: conductorId }] },
          {
            OR: [
              { fechaFin: null },
              { fechaFin: { gt: contrato.fechaInicio } },
            ],
          },
          { fechaInicio: { lt: contrato.fechaFin } },
        ],
      },
      select: { idCamion: true },
    });

    await api.get(detalleContratoUrl).set('Authorization', admin).expect(200);
    expect(db.contratoConductor.findUnique).toHaveBeenCalledWith({
      where: {
        idCamion_idConductor_fechaInicio: {
          idCamion: camionId,
          idConductor: conductorId,
          fechaInicio: contrato.fechaInicio,
        },
      },
      select: contratoConductorSelect,
    });
  });

  it('rechaza períodos inválidos, superposiciones y asignaciones a inactivos', async () => {
    const api = request(app.getHttpServer());
    await api
      .post(contratoUrl)
      .set('Authorization', admin)
      .send({ ...periodo, fechaFin: periodo.fechaInicio })
      .expect(400);
    await api
      .post(contratoUrl)
      .set('Authorization', admin)
      .send({ ...periodo, fechaInicio: '2026-11-21T08:00:00' })
      .expect(400);
    db.contratoConductor.findFirst.mockResolvedValueOnce(contrato);
    await api
      .post(contratoUrl)
      .set('Authorization', admin)
      .send(periodo)
      .expect(409);
    db.camion.findUnique.mockResolvedValueOnce({ estado: Estado.INACTIVO });
    await api
      .post(contratoUrl)
      .set('Authorization', admin)
      .send(periodo)
      .expect(409);
    expect(db.contratoConductor.create).not.toHaveBeenCalled();
  });

  it('edita el fin y devuelve un resultado explícito si no hay contrato vigente', async () => {
    db.contratoConductor.update.mockResolvedValue({
      ...contrato,
      fechaFin: null,
    });
    db.camion.findUnique.mockResolvedValueOnce({ contratos: [] });
    const api = request(app.getHttpServer());
    await api
      .patch(detalleContratoUrl)
      .set('Authorization', admin)
      .send({})
      .expect(400);
    await api
      .patch(detalleContratoUrl)
      .set('Authorization', admin)
      .send({ fechaFin: null })
      .expect(200);
    expect(db.contratoConductor.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { fechaFin: null },
      }),
    );
    await api
      .get(`/api/camiones/${camionId}/contrato-vigente`)
      .set('Authorization', admin)
      .expect(200)
      .expect({ contrato: null });
  });
});
