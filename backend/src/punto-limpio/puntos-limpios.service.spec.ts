import { Test, TestingModule } from '@nestjs/testing';
import { PuntosLimpiosService } from './puntos-limpios.service';
import { PrismaService } from '../prisma/prisma.service';

describe('PuntosLimpiosService', () => {
  let service: PuntosLimpiosService;
  const create = jest.fn();
  const dto = {
    nombre: 'Parque Villegas',
    tipoId: 'tipo-id',
    direccionId: 'direccion-id',
    lat: -35.97,
    long: -62.73,
  };

  beforeEach(async () => {
    create.mockReset();
    const db = {
      puntoLimpio: { create },
      direccion: {
        findUnique: jest.fn().mockResolvedValue({
          id: dto.direccionId,
          lat: dto.lat,
          long: dto.long,
        }),
      },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PuntosLimpiosService,
        {
          provide: PrismaService,
          useValue: {
            $transaction: (operation: (tx: typeof db) => unknown) =>
              operation(db),
          },
        },
      ],
    }).compile();

    service = module.get<PuntosLimpiosService>(PuntosLimpiosService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('devuelve el punto creado', async () => {
    const punto = { id: 'punto-id', ...dto };
    const { lat, long, ...record } = punto;
    create.mockResolvedValue({
      ...record,
      direccion: { lat, long, altura: 50, calle: { calle: 'Roca' } },
    });
    await expect(service.create(dto)).resolves.toEqual({
      ...punto,
      direccion: 'Roca 50',
    });
  });

  it.each([
    { code: 'P2003' },
    { code: 'P2025' },
    { code: 'P2002' },
    new Error('Fallo de conexión'),
    null,
  ])('propaga el error original: %j', async (error) => {
    create.mockRejectedValue(error);
    await expect(service.create(dto)).rejects.toBe(error);
  });
});
