import { createECDH, randomBytes, randomUUID } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { generateVAPIDKeys } from 'web-push';
import { EnvioPushService, TransportePush } from './envio-push.service';
import type { PrismaService } from '../prisma/prisma.service';

it('construye una petición Web Push cifrada y rechaza redirecciones', async () => {
  const { publicKey, privateKey } = generateVAPIDKeys();
  const transporte = new TransportePush(
    new ConfigService({
      PUSH_VAPID_CONTACTO: 'mailto:operador@example.test',
      PUSH_VAPID_PUBLICA: publicKey,
      PUSH_VAPID_PRIVADA: privateKey,
    }),
  );
  const fetchPrueba = jest
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(new Response(null, { status: 201 }));
  const id = randomUUID();
  try {
    const endpoint = 'https://fcm.googleapis.com/fcm/send/dispositivo';
    await expect(
      transporte.enviar(
        {
          endpoint,
          p256dh: createECDH('prime256v1').generateKeys().toString('base64url'),
          auth: randomBytes(16).toString('base64url'),
        },
        id,
        10,
      ),
    ).resolves.toBe(201);
    const [url, opciones] = fetchPrueba.mock.calls[0];
    expect(url).toEqual(new URL(endpoint));
    expect(opciones?.method).toBe('POST');
    expect(opciones?.redirect).toBe('error');
    expect(opciones?.body).toBeInstanceOf(Uint8Array);
    expect(opciones?.headers).toMatchObject({
      'Content-Encoding': 'aes128gcm',
      Topic: id.replaceAll('-', ''),
      TTL: '10',
    });
  } finally {
    fetchPrueba.mockRestore();
  }
});

it('espera al resto del lote cuando falla una entrega', async () => {
  let terminarPendiente!: (valor: { count: number }) => void;
  const pendiente = new Promise<{ count: number }>((resolve) => {
    terminarPendiente = resolve;
  });
  const db = {
    entregaPush: {
      findMany: jest.fn().mockResolvedValue([
        { id: 'fallida', intentos: 0 },
        { id: 'en curso', intentos: 0 },
      ]),
      updateMany: jest
        .fn()
        .mockResolvedValueOnce({ count: 0 })
        .mockRejectedValueOnce(new Error('Sin conexión'))
        .mockReturnValueOnce(pendiente),
    },
  };
  const config = new ConfigService();
  const envios = new EnvioPushService(
    db as unknown as PrismaService,
    config,
    new TransportePush(config),
  );
  let fallo = false;
  const lote = envios
    .despacharPendientes(new Date())
    .catch((error: unknown) => {
      fallo = true;
      expect(error).toMatchObject({ message: 'Falló una entrega push' });
    });
  await new Promise<void>((resolve) => setImmediate(resolve));
  expect(fallo).toBe(false);
  terminarPendiente({ count: 0 });
  await lote;
  expect(fallo).toBe(true);
});
