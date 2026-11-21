import { Test, TestingModule } from '@nestjs/testing';
import { ContratosConductorService } from '../contrato-conductor/contratos-conductor.service';
import { CamionesController } from './camiones.controller';
import { CamionesService } from './camiones.service';

describe('CamionesController', () => {
  let controller: CamionesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CamionesController],
      providers: [
        { provide: CamionesService, useValue: {} },
        { provide: ContratosConductorService, useValue: {} },
      ],
    }).compile();

    controller = module.get<CamionesController>(CamionesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
