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

  it('usa el catálogo compartido en ambos listados', async () => {
    await controller.findAll('Roca');
    expect(service.findAll).toHaveBeenLastCalledWith('Roca');

    await controller.findForPuntosLimpios('Roca');
    expect(service.findAll).toHaveBeenLastCalledWith('Roca');
  });

  it('delega la consulta, el alta, la edición y la baja', async () => {
    const direccion = { calle: 'Roca', altura: 50, lat: -35.97, long: -62.73 };

    await controller.findOne(id);
    expect(service.findOne).toHaveBeenCalledWith(id);

    await controller.create(direccion);
    expect(service.create).toHaveBeenCalledWith(direccion);

    await controller.update(id, { lat: -35.96, long: -62.73 });
    expect(service.update).toHaveBeenCalledWith(id, {
      lat: -35.96,
      long: -62.73,
    });

    await controller.remove(id);
    expect(service.remove).toHaveBeenCalledWith(id);
  });
});
