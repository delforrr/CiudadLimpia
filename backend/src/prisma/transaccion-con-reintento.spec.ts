import { Prisma } from '../generated/prisma/client';
import type { PrismaService } from './prisma.service';
import { transaccionConReintento } from './transaccion-con-reintento';

describe('transaccionConReintento', () => {
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
      transaccionConReintento(
        { $transaction } as unknown as PrismaService,
        guardar,
      ),
    ).resolves.toBe('dirección resuelta');
    expect(guardar.mock.calls).toEqual([[anterior], [siguiente]]);
  });
});

it('limita los reintentos y conserva el mensaje del módulo que escribe', async () => {
  const conflicto = new Prisma.PrismaClientKnownRequestError('Conflicto', {
    code: 'P2034',
    clientVersion: 'test',
  });
  const $transaction = jest.fn().mockRejectedValue(conflicto);
  const opciones = { timeout: 20_000 };
  const guardar = jest.fn();
  await expect(
    transaccionConReintento(
      { $transaction } as unknown as PrismaService,
      guardar,
      opciones,
      'Conflicto propio',
    ),
  ).rejects.toMatchObject({ message: 'Conflicto propio' });
  expect($transaction).toHaveBeenCalledTimes(3);
  expect($transaction).toHaveBeenLastCalledWith(guardar, opciones);
});
