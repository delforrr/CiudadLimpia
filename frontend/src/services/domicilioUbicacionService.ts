import { z } from 'zod';
import { httpRequest } from './http.ts';
import type { Coordenadas, UbicacionSugerida } from './trayectosService.ts';

export const coordenadasDomicilioSchema = z.object({
  lat: z.number().finite().min(-36.04).max(-35.90),
  long: z.number().finite().min(-62.82).max(-62.64),
});
export type SugerenciaDomicilio = Coordenadas & { nombre: string };

export const domicilioUbicacionService = {
  async buscar(calle: string, altura: string, signal: AbortSignal): Promise<SugerenciaDomicilio[]> {
    const query = new URLSearchParams({ calle: calle.trim(), altura: altura.trim(), desplazar: 'true' });
    const { sugerencias } = await httpRequest<{ sugerencias: UbicacionSugerida[] }>(
      '/api/geocodificacion/directa?' + query.toString(),
      { signal: AbortSignal.any([signal, AbortSignal.timeout(7000)]) },
    );
    return sugerencias.flatMap((sugerencia) => {
      const ubicacion = coordenadasDomicilioSchema.safeParse(sugerencia);
      const nombre = [sugerencia.calle, sugerencia.altura].filter((parte) => parte !== null).join(' ');
      return ubicacion.success ? [{ ...ubicacion.data, nombre }] : [];
    });
  },
};
