import { useState } from 'react';
import { Autocomplete, TextField } from '@mui/material';
import { useCalles } from '../hooks/useCalles';
import type { CalleCatalogo } from '../services/callesService';

type Props = {
  calle?: CalleCatalogo | string | null;
  onChange: (opcion: CalleCatalogo | null) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  error?: string;
};

function mismaCalle(a: CalleCatalogo, b: CalleCatalogo) {
  return a.id && b.id ? a.id === b.id : a.calle.localeCompare(b.calle, 'es', { sensitivity: 'accent' }) === 0;
}

export function SelectorCalle({ calle, onChange, label = 'Calle', required, disabled, autoFocus, error }: Props) {
  const catalogo = useCalles();
  const [texto, setTexto] = useState<string | null>(null);
  const guardada = typeof calle === 'string' ? calle && { id: '', calle } : calle;
  const seleccionada = guardada
    ? catalogo.calles.find((opcion) => mismaCalle(opcion, guardada)) ?? guardada
    : null;
  const opciones = seleccionada && !catalogo.calles.includes(seleccionada) ? [seleccionada, ...catalogo.calles] : catalogo.calles;

  return (
    <Autocomplete<CalleCatalogo>
      size="small"
      clearOnBlur={false}
      value={seleccionada}
      inputValue={texto ?? seleccionada?.calle ?? ''}
      options={opciones}
      getOptionKey={(opcion) => opcion.id || opcion.calle}
      getOptionLabel={(opcion) => opcion.calle}
      isOptionEqualToValue={mismaCalle}
      filterOptions={(resultados) => resultados}
      loading={catalogo.cargando}
      loadingText="Buscando calles…"
      noOptionsText={catalogo.error ? 'No se pudo consultar el catálogo.' : 'No se encontraron calles.'}
      disabled={disabled}
      onInputChange={(_, valor, motivo) => {
        if (motivo !== 'input') return;
        setTexto(valor);
        if (seleccionada) onChange(null);
        catalogo.buscar(valor);
      }}
      onChange={(_, opcion) => {
        setTexto(null);
        onChange(opcion);
        catalogo.buscar('');
      }}
      renderInput={(params) => <TextField {...params} label={label} color="success" required={required}
        autoFocus={autoFocus} error={Boolean(error || catalogo.error)} helperText={error} />}
    />
  );
}
