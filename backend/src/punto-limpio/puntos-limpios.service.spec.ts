import { Test, TestingModule } from '@nestjs/testing';
import { PuntosLimpiosService } from './puntos-limpios.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DireccionesService } from '../direccion/direcciones.service';

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
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PuntosLimpiosService,
        {
          provide: PrismaService,
          useValue: {
            puntoLimpio: { create },
            direccion: {
              findUnique: jest.fn().mockResolvedValue({ id: dto.direccionId }),
            },
          },
        },
        { provide: DireccionesService, useValue: {} },
      ],
    }).compile();

    service = module.get<PuntosLimpiosService>(PuntosLimpiosService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('devuelve el punto creado', async () => {
    const punto = { id: 'punto-id', ...dto };
    create.mockResolvedValue(punto);
    await expect(service.create(dto)).resolves.toEqual(punto);
  });

  it.each([
    [
      'P2003',
      BadRequestException,
      'El tipo o la dirección indicados no existen',
    ],
    ['P2025', NotFoundException, 'Punto limpio no encontrado'],
  ])('traduce %s a una excepción HTTP', async (code, exception, message) => {
    create.mockRejectedValue({ code });
    const result = service.create(dto);
    await expect(result).rejects.toBeInstanceOf(exception);
    await expect(result).rejects.toThrow(message);
  });

  it.each([new Error('Fallo de conexión'), { code: 'P2002' }, null])(
    'conserva errores no contemplados: %j',
    async (error) => {
      create.mockRejectedValue(error);
      await expect(service.create(dto)).rejects.toBe(error);
    },
  );
});
