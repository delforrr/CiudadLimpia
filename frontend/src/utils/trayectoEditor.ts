import type { Coordenadas, LineaTrayecto, Referencia, Trayecto, TrayectoEnvio } from '../services/trayectosService.ts';

export type PuntoEditor = Coordenadas & {
  clave: string;
  direccionId?: string;
  referencia?: Referencia;
};

export type BorradorTrayecto = {
  id?: string;
  nombre: string;
  localidadId: string;
  puntos: PuntoEditor[];
  lineaElegida: LineaTrayecto | null;
};

export function abrirBorrador(trayecto: Trayecto): BorradorTrayecto {
  const { id, nombre, localidadId, puntos, geometria } = trayecto;
  return {
    id, nombre, localidadId, lineaElegida: geometria,
    puntos: [...puntos].sort((a, b) => a.orden - b.orden)
      .map(({ lat, long, orden, direccionId, direccion }) => ({
        clave: String(orden), lat, long, direccionId,
        referencia: direccion.calle ? { calle: direccion.calle, altura: direccion.altura } : undefined,
      })),
  };
}

export function lineaManual(puntos: Coordenadas[]): LineaTrayecto {
  return { type: 'LineString', coordinates: puntos.map(({ lat, long }) => [long, lat]) };
}

export function tienePosicionesDistintas(puntos: Coordenadas[]) {
  const primero = puntos[0];
  return puntos.some(({ lat, long }) => lat !== primero.lat || long !== primero.long);
}

export function prepararTrayecto(borrador: BorradorTrayecto): TrayectoEnvio {
  return {
    nombre: borrador.nombre.trim(),
    localidadId: borrador.localidadId,
    geometria: borrador.lineaElegida ?? lineaManual(borrador.puntos),
    puntos: borrador.puntos.map(({ lat, long, direccionId, referencia }, orden) => ({
      lat, long, orden,
      ...(direccionId ? { direccionId } : referencia ? { direccion: referencia } : {}),
    })),
  };
}
