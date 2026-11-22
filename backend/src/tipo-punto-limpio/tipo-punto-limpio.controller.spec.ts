import { TipoPuntoLimpioController } from './tipo-punto-limpio.controller';
import { TipoPuntoLimpioService } from './tipo-punto-limpio.service';

describe('TipoPuntoLimpioController', () => {
  const id = '00000000-0000-4000-8000-000000000001';
  const residuoId = '00000000-0000-4000-8000-000000000002';
  const service = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };
  const controller = new TipoPuntoLimpioController(
    service as unknown as TipoPuntoLimpioService,
  );

  beforeEach(() => jest.resetAllMocks());

  it('delegates the CRUD operations to the service', async () => {
    await controller.findAll();
    expect(service.findAll).toHaveBeenCalled();

    await controller.findOne(id);
    expect(service.findOne).toHaveBeenCalledWith(id);

    const dto = { nombre: 'Botellero', residuos: [residuoId] };
    await controller.create(dto);
    expect(service.create).toHaveBeenCalledWith(dto);

    await controller.update(id, dto);
    expect(service.update).toHaveBeenCalledWith(id, dto);

    await controller.remove(id);
    expect(service.remove).toHaveBeenCalledWith(id);
  });
});
