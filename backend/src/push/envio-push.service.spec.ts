import { createECDH, randomBytes, randomUUID } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { generateVAPIDKeys } from 'web-push';
import { TransportePush } from './envio-push.service';

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
