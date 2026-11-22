import { Autocomplete, Button, MenuItem, TextField } from '@mui/material';
import { useCallesTrayecto } from '../hooks/useCallesTrayecto';
import type { CalleCatalogo, LadoRecoleccion, LineaTrayecto } from '../services/trayectosService';
import type { PuntoEditor } from '../utils/trayectoEditor';
import { referenciaEnVertice, type TramoEditor } from '../utils/tramosTrayecto';
import './TramosTrayecto.css';

type Props = {
  tramos: TramoEditor[];
  activo: TramoEditor;
  linea: LineaTrayecto;
  puntos: PuntoEditor[];
  guardando: boolean;
  dividiendo: boolean;
  seleccionar: (desde: number) => void;
  asignar: (calle: CalleCatalogo | null) => void;
  cambiarLado: (lado: LadoRecoleccion) => void;
  alternarDivision: () => void;
};

function CalleDelTramo({ calle, guardando, asignar }: Pick<Props, 'guardando' | 'asignar'> & { calle?: CalleCatalogo }) {
  const catalogo = useCallesTrayecto();
  const opciones = calle && !catalogo.calles.some(({ id }) => id === calle.id) ? [calle, ...catalogo.calles] : catalogo.calles;
  return (
    <Autocomplete
      size="small"
      value={calle ?? null}
      options={opciones}
      getOptionLabel={(opcion) => opcion.calle}
      isOptionEqualToValue={(a, b) => a.id === b.id}
      filterOptions={(resultados) => resultados}
      loading={catalogo.cargando}
      loadingText="Buscando calles…"
      noOptionsText={catalogo.error ? 'No se pudo consultar el catálogo.' : 'No se encontraron calles.'}
      disabled={guardando}
      onInputChange={(_, texto, motivo) => {
        if (motivo === 'input' || motivo === 'clear') catalogo.buscar(texto);
      }}
      onChange={(_, opcion) => asignar(opcion)}
      renderInput={(params) => <TextField {...params} label="Calle cubierta" error={catalogo.error} />}
    />
  );
}

export function TramosTrayecto({ tramos, activo, linea, puntos, guardando, dividiendo, seleccionar, asignar, cambiarLado, alternarDivision }: Props) {
  const extremos = [
    referenciaEnVertice(linea, activo.desde, puntos),
    referenciaEnVertice(linea, activo.hasta, puntos),
  ];
  const etiquetaExtremo = (indice: number) => {
    const referencia = extremos[indice];
    if (!referencia) {
      const vertice = indice === 0 ? activo.desde : activo.hasta;
      return vertice === 0 ? 'inicio del recorrido'
        : vertice === linea.coordinates.length - 1 ? 'fin del recorrido' : 'punto de división en el mapa';
    }
    return referencia.calle.localeCompare(activo.calle?.calle ?? '', 'es-AR', { sensitivity: 'accent' }) === 0 && referencia.altura !== null
      ? `${referencia.calle} ${referencia.altura}` : referencia.calle;
  };
  return (
    <section className="trayecto-cobertura" aria-label="Cobertura por tramo">
      <h4>Cobertura por tramo</h4>
      <ol className="trayecto-cobertura-lista">
        {tramos.map((tramo, i) => (
          <li key={tramo.desde}>
            <Button size="small" color={tramo.desde === activo.desde ? 'primary' : 'inherit'}
              aria-pressed={tramo.desde === activo.desde} disabled={guardando}
              onClick={() => seleccionar(tramo.desde)}>
              Tramo {i + 1} · {tramo.calle?.calle ?? 'Pendiente'}
            </Button>
          </li>
        ))}
      </ol>
      <dl className="trayecto-cobertura-extremos">
        <dt>Desde</dt><dd>{etiquetaExtremo(0)}</dd>
        <dt>Hasta</dt><dd>{etiquetaExtremo(1)}</dd>
      </dl>
      <CalleDelTramo key={activo.desde} calle={activo.calle} guardando={guardando} asignar={asignar} />
      {activo.calle && (
        <TextField select size="small" label="Veredas atendidas" value={activo.lado ?? 'AMBOS'} disabled={guardando}
          helperText="Izquierda y derecha según el sentido de marcha."
          onChange={(event) => cambiarLado(event.target.value as LadoRecoleccion)}>
          <MenuItem value="AMBOS">Ambas veredas</MenuItem>
          <MenuItem value="IZQUIERDA">Solo la izquierda</MenuItem>
          <MenuItem value="DERECHA">Solo la derecha</MenuItem>
        </TextField>
      )}
      <Button size="small" color="success" disabled={guardando} onClick={alternarDivision}>
        {dividiendo ? 'Cancelar división' : 'Dividir en el mapa'}
      </Button>
    </section>
  );
}
