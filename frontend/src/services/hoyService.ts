import { httpRequest } from './http.ts';
import type { Coordenadas, LineaTrayecto } from './trayectosService.ts';

export type TrayectosHoy = {
  domicilio: Coordenadas;
  trayectos: { id: string; recorridoId: string; nombre: string; geometria: LineaTrayecto }[];
};

export type CamionHoy = {
    servicioId: string;
    camionId: string;
    trayectoId: string;
    recorridoId: string;
    nombre: string;
    posicion: Coordenadas;
    registradoEn: string;
};

export function consultarTrayectosHoy(direccionId: string, signal?: AbortSignal) {
  return httpRequest<TrayectosHoy>(`/api/hoy/domicilios/${encodeURIComponent(direccionId)}/trayectos`, { signal });
}

export function consultarCamionesHoy(direccionId: string, signal?: AbortSignal) {
  return httpRequest<CamionHoy[]>(`/api/hoy/domicilios/${encodeURIComponent(direccionId)}/camiones`, { signal });
}
