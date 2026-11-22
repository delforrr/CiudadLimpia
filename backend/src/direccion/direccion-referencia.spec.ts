import {
  resolverDireccion,
  transaccionConDirecciones,
  type ReferenciaDireccion,
} from './direccion-referencia';
import { Prisma } from '../generated/prisma/client';
import type { PrismaService } from '../prisma/prisma.service';

describe('resolverDireccion', () => {
  const registro = {
    id: '7a1487dd-134a-4020-abc0-0966fa38f447',
    calle: { calle: 'JULIO A ROCA' },
    altura: 860,
    lat: -35.9772061307347,
    long: -62.7320247703061,
  };
  const pin = { lat: -35.97720613073469, long: -62.732024770306126 };
  const tx = {
    calle: { upsert: jest.fn().mockResolvedValue({ id: 'calle-id' }) },
    direccion: {
      createMany: jest.fn(),
      findUnique: jest.fn().mockResolvedValue(registro),
      findUniqueOrThrow: jest.fn().mockResolvedValue(registro),
    },
  } as unknown as Prisma.TransactionClient;

  const referencias: ReferenciaDireccion[] = [
    { direccionId: registro.id, coordenadas: pin },
    { direccion: { calle: 'Julio A Roca', altura: 860, ...pin } },
  ];
  it.each(referencias)(
    'reutiliza el pin guardado ante un redondeo (%j)',
    async (referencia) => {
      await expect(resolverDireccion(tx, referencia)).resolves.toBe(registro);
    },
  );

  it.each(['lat', 'long'] as const)(
    'rechaza un cambio de %s',
    async (campo) => {
      await expect(
        resolverDireccion(tx, {
          direccionId: registro.id,
          coordenadas: { ...pin, [campo]: pin[campo] + 0.00001 },
        }),
      ).rejects.toMatchObject({
        response: { statusCode: 409, code: 'PIN_DIRECCION_DISTINTO' },
      });
    },
  );
});

describe('transaccionConDirecciones', () => {
  it('vuelve a ejecutar la operación completa tras un conflicto de escritura', async () => {
    const anterior = {};
    const siguiente = {};
    const guardar = jest.fn().mockResolvedValue('dirección resuelta');
    const $transaction = jest
      .fn()
      .mockImplementationOnce(
        async (operacion: (tx: object) => Promise<unknown>) => {
          await operacion(anterior);
          throw new Prisma.PrismaClientKnownRequestError(
            'Conflicto de escritura',
            {
              code: 'P2034',
              clientVersion: 'test',
            },
          );
        },
      )
      .mockImplementationOnce((operacion: (tx: object) => Promise<unknown>) =>
        operacion(siguiente),
      );

    await expect(
      transaccionConDirecciones(
        { $transaction } as unknown as PrismaService,
        guardar,
      ),
    ).resolves.toBe('dirección resuelta');
    expect(guardar.mock.calls).toEqual([[anterior], [siguiente]]);
  });
});
