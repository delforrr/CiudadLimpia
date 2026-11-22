import { httpRequest } from './http.ts';
import type { Coordenadas } from './trayectosService.ts';

type Direccion = Coordenadas & { id: string; calle: string; altura: number; direccion: string };

const ruta = (id: string) => `/direcciones/${encodeURIComponent(id)}`;

export const direccionesService = {
  consultar: (id: string, signal: AbortSignal) => httpRequest<Direccion>(ruta(id), { signal }),
  corregirUbicacion: (id: string, { lat, long }: Coordenadas) =>
    httpRequest<Direccion>(ruta(id), { method: 'PATCH', body: JSON.stringify({ lat, long }) }),
};
