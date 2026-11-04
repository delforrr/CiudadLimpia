import { DireccionesController } from './direcciones.controller';
import type { DireccionesService } from './direcciones.service';

describe('DireccionesController', () => {
  const id = '00000000-0000-4000-8000-000000000001';
  const service = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };
  const controller = new DireccionesController(
    service as unknown as DireccionesService,
  );

  beforeEach(() => jest.resetAllMocks());

  it('distingue el listado general del catálogo para puntos limpios', async () => {
    await controller.findAll('Roca');
    expect(service.findAll).toHaveBeenLastCalledWith('Roca');

    await controller.findForPuntosLimpios('Roca');
    expect(service.findAll).toHaveBeenLastCalledWith('Roca', true);
  });

  it('delega la consulta, el alta, la edición y la baja', async () => {
    const direccion = { calle: 'Roca', altura: 50 };

    await controller.findOne(id);
    expect(service.findOne).toHaveBeenCalledWith(id);

    await controller.create(direccion);
    expect(service.create).toHaveBeenCalledWith(direccion);

    await controller.update(id, { altura: 52 });
    expect(service.update).toHaveBeenCalledWith(id, { altura: 52 });

    await controller.remove(id);
    expect(service.remove).toHaveBeenCalledWith(id);
  });
});
