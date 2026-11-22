import { z } from 'zod';
import type { Coordenadas } from './trayectosService.ts';

export const coordenadasDomicilioSchema = z.object({
  lat: z.number().finite().min(-36.04).max(-35.90),
  long: z.number().finite().min(-62.82).max(-62.64),
});
const direccionGeorefSchema = z.object({
  localidad_censal: z.object({ id: z.string() }),
  ubicacion: z.object({ lat: z.number(), lon: z.number() }),
  nomenclatura: z.string().optional(),
});
export type SugerenciaDomicilio = Coordenadas & { nombre: string };

export const domicilioUbicacionService = {
  async buscar(calle: string, altura: string, signal: AbortSignal): Promise<SugerenciaDomicilio[]> {
    const query = new URLSearchParams({ direccion: `${calle.trim()} ${altura.trim()}`,
      provincia: '06', departamento: '06826', localidad_censal: '06826050', campos: 'completo', max: '3',
      desplazar: 'true' });
    const response = await fetch(`https://apis.datos.gob.ar/georef/api/v2.0/direcciones?${query}`, {
      signal: AbortSignal.any([signal, AbortSignal.timeout(7000)]), credentials: 'omit', referrerPolicy: 'no-referrer',
    });
    if (!response.ok) throw new Error('No se pudo buscar la dirección.');
    const datos = z.object({ direcciones: z.array(z.unknown()) }).parse(await response.json());
    return datos.direcciones.flatMap((dato) => {
      const parsed = direccionGeorefSchema.safeParse(dato);
      if (!parsed.success || parsed.data.localidad_censal.id !== '06826050') return [];
      const ubicacion = coordenadasDomicilioSchema.safeParse({ lat: parsed.data.ubicacion.lat, long: parsed.data.ubicacion.lon });
      return ubicacion.success ? [{ ...ubicacion.data, nombre: parsed.data.nomenclatura ?? `${calle} ${altura}` }] : [];
    });
  },
  leer(userId: string, direccion: string): Coordenadas | undefined {
    try {
      const raw = localStorage.getItem(clave(userId, direccion));
      if (!raw) return undefined;
      const parsed = coordenadasDomicilioSchema.safeParse(JSON.parse(raw));
      return parsed.success ? parsed.data : undefined;
    } catch { return undefined; }
  },
  guardar(userId: string, direccion: string, posicion: Coordenadas) {
    localStorage.setItem(clave(userId, direccion), JSON.stringify(coordenadasDomicilioSchema.parse(posicion)));
  },
};

function clave(userId: string, direccion: string) {
  return `ciudad-limpia:ubicacion-domicilio:${userId}:${direccion.trim().toLocaleLowerCase('es').replace(/\s+/g, ' ')}`;
}
