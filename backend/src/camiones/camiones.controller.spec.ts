import { Test, TestingModule } from '@nestjs/testing';
import { CamionesController } from './camiones.controller';

describe('CamionesController', () => {
  let controller: CamionesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CamionesController],
    }).compile();

    controller = module.get<CamionesController>(CamionesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
