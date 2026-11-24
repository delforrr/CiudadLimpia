import type { CalleCatalogo } from '../services/callesService.ts';
import type { LadoRecoleccion, LineaTrayecto } from '../services/trayectosService.ts';
import { lineaManual, type BorradorTrayecto, type PuntoEditor } from './trayectoEditor.ts';
import { tramosDeLinea, type dividirTramo, type TramoEditor } from './tramosTrayecto.ts';

type Estado = { borrador: BorradorTrayecto; revisarCobertura: boolean };
type Accion =
  | { tipo: 'puntos'; puntos: PuntoEditor[] }
  | { tipo: 'linea'; linea: LineaTrayecto | null }
  | { tipo: 'nombre'; nombre: string }
  | { tipo: 'zona'; zonaId: string }
  | { tipo: 'calle'; tramo: TramoEditor; calle: CalleCatalogo | null }
  | { tipo: 'lado'; desde: number; lado: LadoRecoleccion }
  | { tipo: 'corte'; desde: number; corte: NonNullable<ReturnType<typeof dividirTramo>> };

function cambiarTrazado(estado: Estado, lineaElegida: LineaTrayecto | null, puntos = estado.borrador.puntos): Estado {
  const { borrador } = estado;
  return {
    revisarCobertura: estado.revisarCobertura || Boolean(borrador.tramos?.length),
    borrador: { ...borrador, puntos, lineaElegida, cortes: undefined, tramos: borrador.tramos && [] },
  };
}

function dividirCobertura(borrador: BorradorTrayecto, desde: number, { indice, posicion }: Extract<Accion, { tipo: 'corte' }>['corte']): BorradorTrayecto {
  const linea = borrador.lineaElegida ?? lineaManual(borrador.puntos);
  const tramos = tramosDeLinea(linea, borrador);
  const coordinates = [...linea.coordinates];
  if (posicion) coordinates.splice(indice, 0, posicion);
  const desplazar = (vertice: number) => posicion && vertice >= indice ? vertice + 1 : vertice;
  return {
    ...borrador,
    lineaElegida: { ...linea, coordinates },
    cortes: [...new Set([...tramos.flatMap(({ desde, hasta }) => [desplazar(desde), desplazar(hasta)]), indice])],
    tramos: borrador.tramos?.flatMap((confirmado) => {
      const ajustado = { ...confirmado, desde: desplazar(confirmado.desde), hasta: desplazar(confirmado.hasta) };
      return confirmado.desde === desde
        ? [{ ...ajustado, hasta: indice }, { ...ajustado, desde: indice }]
        : [ajustado];
    }),
  };
}

export function reducirBorrador(estado: Estado, accion: Accion): Estado {
  const { borrador } = estado;
  switch (accion.tipo) {
    case 'puntos':
      return cambiarTrazado(estado, null, accion.puntos);
    case 'linea':
      return cambiarTrazado(estado, accion.linea);
    case 'nombre':
      return { ...estado, borrador: { ...borrador, nombre: accion.nombre } };
    case 'zona':
      return { ...estado, borrador: { ...borrador, zonaId: accion.zonaId } };
    case 'lado':
      return {
        ...estado,
        borrador: { ...borrador, tramos: borrador.tramos?.map((tramo) =>
          tramo.desde === accion.desde ? { ...tramo, lado: accion.lado } : tramo) },
      };
    case 'calle': {
      const { tramo: { desde, hasta, lado }, calle } = accion;
      const confirmados = (borrador.tramos ?? []).filter((tramo) => tramo.desde !== desde);
      if (calle) confirmados.push({ desde, hasta, calleId: calle.id, calle, lado });
      const linea = borrador.lineaElegida ?? lineaManual(borrador.puntos);
      const cortes = tramosDeLinea(linea, borrador).flatMap(({ desde, hasta }) => [desde, hasta]);
      return { ...estado, borrador: { ...borrador, tramos: confirmados, cortes: [...new Set(cortes)] } };
    }
    case 'corte':
      return { ...estado, borrador: dividirCobertura(borrador, accion.desde, accion.corte) };
  }
}
