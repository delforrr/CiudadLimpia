import { httpRequest } from './http.ts';
import type { CalleCatalogo } from './callesService.ts';

export type Coordenadas = { lat: number; long: number };
export type Referencia = { calle: string; altura: number | null };
export type LineaTrayecto = { type: 'LineString'; coordinates: [number, number][] };
export type LadoRecoleccion = 'AMBOS' | 'IZQUIERDA' | 'DERECHA';
export type TramoConfirmado = { desde: number; hasta: number; calleId: string; calle: CalleCatalogo; lado?: LadoRecoleccion };
export type Localidad = { id: string; nombre: string };
export type UbicacionSugerida = Coordenadas & Referencia;
export type SugerenciaTrayecto = { geometria: LineaTrayecto; fuente: string };

type PuntoEnvio = Coordenadas & { orden: number; direccionId?: string; direccion?: Referencia };
export type TrayectoEnvio = {
  nombre: string;
  localidadId: string;
  zonaId: string;
  geometria: LineaTrayecto;
  puntos: PuntoEnvio[];
  tramos: Omit<TramoConfirmado, 'calle'>[];
};

export type Trayecto = Omit<TrayectoEnvio, 'puntos' | 'tramos'> & {
  id: string;
  tramos?: TramoConfirmado[] | null;
  puntos: (Coordenadas & {
    orden: number;
    direccionId: string;
    direccion: { calle: string | null; altura: number | null; direccion: string };
  })[];
};

const ruta = '/api/trayectos';
const geo = '/api/geocodificacion';

export const trayectosService = {
  listar: (signal?: AbortSignal) => httpRequest<Trayecto[]>(ruta, { signal }),
  localidades: (signal?: AbortSignal) => httpRequest<Localidad[]>('/api/localidades', { signal }),
  consultar: (id: string, signal?: AbortSignal) =>
    httpRequest<Trayecto>(`${ruta}/${encodeURIComponent(id)}`, { signal }),
  eliminar: (id: string) =>
    httpRequest<void>(`${ruta}/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  guardar: (datos: TrayectoEnvio, id?: string) =>
    httpRequest<Trayecto>(id ? `${ruta}/${encodeURIComponent(id)}` : ruta, {
      method: id ? 'PATCH' : 'POST',
      body: JSON.stringify(datos),
    }),
  buscar: (calle: string, altura: number, signal: AbortSignal) => {
    const query = new URLSearchParams({ calle, altura: String(altura) });
    return httpRequest<{ sugerencias: UbicacionSugerida[]; fuente: string }>(`${geo}/directa?${query}`, { signal });
  },
  invertir: ({ lat, long }: Coordenadas, signal: AbortSignal) => {
    const query = new URLSearchParams({ lat: lat.toFixed(8), long: long.toFixed(8) });
    return httpRequest<{ direccionSugerida: Referencia | null; fuente: string }>(`${geo}/inversa?${query}`, { signal });
  },
  sugerir: (puntos: Coordenadas[], signal: AbortSignal) =>
    httpRequest<SugerenciaTrayecto>(`${ruta}/sugerencia`, {
      method: 'POST',
      body: JSON.stringify({ puntos: puntos.map(({ lat, long }) => ({ lat, long })) }),
      signal,
    }),
};
