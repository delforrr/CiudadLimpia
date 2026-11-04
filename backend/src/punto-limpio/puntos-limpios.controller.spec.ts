import { Test, TestingModule } from '@nestjs/testing';
import { PuntosLimpiosService } from './puntos-limpios.service';
import { PuntosLimpiosController } from './puntos-limpios.controller';

describe('PuntosLimpiosController', () => {
  let controller: PuntosLimpiosController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PuntosLimpiosController],
      providers: [{ provide: PuntosLimpiosService, useValue: {} }],
    }).compile();

    controller = module.get<PuntosLimpiosController>(PuntosLimpiosController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
