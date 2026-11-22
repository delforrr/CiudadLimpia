import type { Coordenadas, LineaTrayecto, Referencia, TramoConfirmado, Trayecto, TrayectoEnvio } from '../services/trayectosService.ts';

export type PuntoEditor = Coordenadas & {
  clave: string;
  direccionId?: string;
  referencia?: Referencia;
};

export type BorradorTrayecto = {
  id?: string;
  nombre: string;
  localidadId: string;
  zonaId?: string;
  puntos: PuntoEditor[];
  lineaElegida: LineaTrayecto | null;
  tramos?: TramoConfirmado[];
  cortes?: number[];
};

export function completarAltura(referencia: Referencia, alturaManual: string): Referencia {
  if (referencia.altura !== null) return referencia;
  const texto = alturaManual.trim();
  const altura = Number(texto);
  if (!/^\d+$/.test(texto) || !Number.isInteger(altura) || altura < 1 || altura > 2147483647) {
    throw new Error('Campo obligatorio');
  }
  return { ...referencia, altura };
}

export function abrirBorrador(trayecto: Trayecto): BorradorTrayecto {
  const { id, nombre, localidadId, puntos, geometria, tramos } = trayecto;
  return {
    id, nombre, localidadId, lineaElegida: geometria,
    tramos: tramos ?? undefined,
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
    tramos: (borrador.tramos ?? []).map(({ desde, hasta, calleId, lado }) => ({
      desde, hasta, calleId, ...(lado && { lado }),
    })),
    puntos: borrador.puntos.map(({ lat, long, direccionId, referencia }, orden) => ({
      lat, long, orden,
      ...(direccionId ? { direccionId } : referencia ? { direccion: referencia } : {}),
    })),
  };
}
