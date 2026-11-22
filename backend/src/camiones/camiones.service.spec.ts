import { Estado } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { camionSelect } from './camiones.select';
import { CamionesService } from './camiones.service';
import { CreateCamionDto } from './dto/create-camion.dto';

describe('CamionesService', () => {
  let service: CamionesService;
  let prisma: {
    camion: {
      create: jest.Mock;
    };
  };

  const mockCamionDto: CreateCamionDto = {
    patente: 'AB 123 CD',
    marca: 'Mercedes-Benz',
    modelo: 'Atego 1729',
    anio: 2020,
    estado: Estado.ACTIVO,
  };

  const mockCamionRecord = {
    id: 'camion-uuid-1',
    patente: 'AB 123 CD',
    marca: 'Mercedes-Benz',
    modelo: 'Atego 1729',
    anio: 2020,
    estado: Estado.ACTIVO,
  };

  beforeEach(() => {
    prisma = {
      camion: {
        create: jest.fn(),
      },
    };
    service = new CamionesService(prisma as unknown as PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('debe crear un camión y retornar el registro proyectado', async () => {
      prisma.camion.create.mockResolvedValue(mockCamionRecord);

      const result = await service.create(mockCamionDto);

      expect(result).toEqual(mockCamionRecord);
      expect(prisma.camion.create).toHaveBeenCalledWith({
        data: mockCamionDto,
        select: camionSelect,
      });
    });

    it('propaga el error de Prisma si la patente ya existe', async () => {
      const error = { code: 'P2002' };
      prisma.camion.create.mockRejectedValue(error);

      await expect(service.create(mockCamionDto)).rejects.toBe(error);
    });

    it('debe propagar otros errores inesperados', async () => {
      const errorInesperado = new Error('Database connection failed');
      prisma.camion.create.mockRejectedValue(errorInesperado);

      await expect(service.create(mockCamionDto)).rejects.toThrow(
        errorInesperado,
      );
    });
  });
});
