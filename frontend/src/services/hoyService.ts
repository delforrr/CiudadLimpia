import { httpRequest } from './http.ts';
import type { Coordenadas, LineaTrayecto } from './trayectosService.ts';

export type MapaHoy = {
  domicilio: Coordenadas;
  trayectos: { id: string; recorridoId: string; nombre: string; geometria: LineaTrayecto }[];
  camiones: {
    servicioId: string;
    camionId: string;
    trayectoId: string;
    recorridoId: string;
    nombre: string;
    posicion: Coordenadas;
    registradoEn: string;
  }[];
};

export function consultarMapaHoy(direccionId: string, signal?: AbortSignal) {
  return httpRequest<MapaHoy>(`/api/hoy/domicilios/${encodeURIComponent(direccionId)}/mapa`, { signal });
}
