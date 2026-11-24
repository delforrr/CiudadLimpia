import { httpRequest } from './http.ts';

type DatosZona = { nombre: string; descripcion: string };
export type Zona = DatosZona & { id: string; localidadId: string };

const ruta = '/api/zonas';
export const zonasService = {
  listar: (signal: AbortSignal) => httpRequest<Zona[]>(ruta, { signal }),
  crear: (datos: DatosZona & { localidadId: string }) =>
    httpRequest<Zona>(ruta, { method: 'POST', body: JSON.stringify(datos) }),
  editar: (id: string, datos: DatosZona) =>
    httpRequest<Zona>(ruta + '/' + encodeURIComponent(id), { method: 'PATCH', body: JSON.stringify(datos) }),
  eliminar: (id: string) => httpRequest<void>(ruta + '/' + encodeURIComponent(id), { method: 'DELETE' }),
};
