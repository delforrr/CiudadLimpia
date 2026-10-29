import { Test, TestingModule } from '@nestjs/testing';
import { PuntosLimpiosService } from './puntos-limpios.service';

describe('PuntosLimpiosService', () => {
  let service: PuntosLimpiosService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PuntosLimpiosService],
    }).compile();

    service = module.get<PuntosLimpiosService>(PuntosLimpiosService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
