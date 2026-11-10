import { useState } from 'react';
import {
  Alert, Button, Chip, FormControlLabel, MenuItem, Paper, Radio, RadioGroup, TextField,
  ToggleButton, ToggleButtonGroup,
} from '@mui/material';
import { useTrayectoEditor } from '../hooks/useTrayectoEditor';
import type { Localidad, Referencia, Trayecto } from '../services/trayectosService';
import type { BorradorTrayecto } from '../utils/trayectoEditor';
import { TrayectoMapa } from './TrayectoMapa';

const referenciaTexto = ({ calle, altura }: Referencia) => `${calle} ${altura ?? '· sin altura'}`;

type Props = {
  inicial: BorradorTrayecto;
  localidades: Localidad[];
  onCancelar: () => void;
  onGuardado: (trayecto: Trayecto) => void;
};

export function TrayectoEditor({ inicial, localidades, onCancelar, onGuardado }: Props) {
  const editor = useTrayectoEditor(inicial, onGuardado);
  const [panel, setPanel] = useState<'mapa' | 'puntos'>('mapa');
  const { borrador, pin, inversa, busqueda, sugerencia, guardando } = editor;

  return (
    <Paper component="section" variant="outlined" className="trayectos-panel" aria-label="Editor de trayectos">
      <h3>{borrador.id ? 'Editar trayecto' : 'Nuevo trayecto'}</h3>
      {editor.error && <Alert severity="error">{editor.error}</Alert>}
      <div className="trayectos-campos">
        <TextField label="Nombre del trayecto" required size="small" value={borrador.nombre}
          disabled={guardando} slotProps={{ htmlInput: { maxLength: 100 } }}
          onChange={(event) => editor.actualizarCampo('nombre', event.target.value)} />
        <TextField label="Localidad" required select size="small" value={borrador.localidadId}
          disabled={guardando || localidades.length === 0}
          onChange={(event) => editor.actualizarCampo('localidadId', event.target.value)}>
          {localidades.map(({ id, nombre }) => <MenuItem key={id} value={id}>{nombre}</MenuItem>)}
        </TextField>
      </div>
      {localidades.length === 0 && <Alert severity="warning">El catálogo de localidades está vacío.</Alert>}

      <form className="trayectos-busqueda" onSubmit={(event) => {
        event.preventDefault();
        void editor.buscarDireccion();
      }}>
        <TextField label="Calle" size="small" value={editor.calle} disabled={guardando}
          slotProps={{ htmlInput: { maxLength: 180 } }}
          onChange={(event) => editor.actualizarBusqueda('calle', event.target.value)} />
        <TextField label="Altura" size="small" value={editor.altura} disabled={guardando}
          slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 10 } }}
          onChange={(event) => editor.actualizarBusqueda('altura', event.target.value)} />
        <Button type="submit" variant="outlined" color="success" disabled={guardando || busqueda.cargando}>
          {busqueda.cargando ? 'Buscando…' : 'Buscar dirección'}
        </Button>
      </form>
      {busqueda.error && <Alert severity="warning">{busqueda.error}</Alert>}
      {busqueda.resultado && (
        <div className="trayectos-resultados">
          {busqueda.resultado.sugerencias.length === 0 && <p>No encontramos ubicaciones. Podés marcar un pin en el mapa.</p>}
          {busqueda.resultado.sugerencias.map((ubicacion, indice) => (
            <Button key={indice} variant="outlined" color="success" disabled={guardando}
              onClick={() => {
                setPanel('mapa');
                void editor.usarUbicacion(ubicacion);
              }}>
              {referenciaTexto(ubicacion)}
            </Button>
          ))}
          <small>{busqueda.resultado.fuente}</small>
        </div>
      )}

      <ToggleButtonGroup className="trayectos-alternar" size="small" exclusive value={panel}
        onChange={(_, valor: typeof panel | null) => { if (valor) setPanel(valor); }} aria-label="Vista del editor">
        <ToggleButton value="mapa">Mapa</ToggleButton>
        <ToggleButton value="puntos">Puntos ({borrador.puntos.length})</ToggleButton>
      </ToggleButtonGroup>
      <div className="trayectos-vistas" data-panel={panel}>
        <div className="trayectos-vista-mapa">
          <TrayectoMapa puntos={borrador.puntos} linea={editor.linea} sugerida={sugerencia.resultado?.geometria}
            pin={pin} onMarcar={guardando ? undefined : editor.marcarEnMapa} />
          <p className="trayectos-ayuda">
            {pin ? 'Arrastrá el pin o tocá el mapa para ajustar su posición.' : 'Tocá el mapa para marcar un punto de paso.'}
          </p>
        </div>
        <div className="trayectos-vista-puntos">
          <h4>Puntos de paso</h4>
          <PuntosTrayecto puntos={borrador.puntos} acciones={(punto, indice) => (
            <div className="trayectos-acciones">
              <Button size="small" color="success" disabled={guardando || Boolean(pin)}
                onClick={() => { setPanel('mapa'); void editor.editarPunto(punto); }}
                aria-label={`Mover punto ${indice + 1} en el mapa`}>Mover</Button>
              <Button size="small" color="error" disabled={guardando || Boolean(pin)}
                onClick={() => editor.quitarPunto(punto.clave)} aria-label={`Quitar punto ${indice + 1}`}>Quitar</Button>
              <Button size="small" color="success" disabled={guardando || Boolean(pin) || indice === 0}
                onClick={() => editor.moverEnLista(indice, -1)} aria-label={`Subir punto ${indice + 1}`}>Subir</Button>
              <Button size="small" color="success" disabled={guardando || Boolean(pin) || indice === borrador.puntos.length - 1}
                onClick={() => editor.moverEnLista(indice, 1)} aria-label={`Bajar punto ${indice + 1}`}>Bajar</Button>
            </div>
          )} />
        </div>
      </div>

      {pin && (
        <section className="trayectos-revision" aria-label="Confirmar pin">
          <h4>{pin.origen ? 'Confirmar cambios del punto' : 'Confirmar nuevo punto'}</h4>
          <p>{pin.lat.toFixed(6)}, {pin.long.toFixed(6)}</p>
          {inversa.cargando && <p role="status">Buscando referencia cercana…</p>}
          {inversa.error && <Alert severity="warning">{inversa.error}</Alert>}
          {inversa.resultado === null && <p>GeoRef no encontró una referencia para el pin.</p>}
          <RadioGroup value={editor.referenciaElegida} aria-label="Referencia del punto" onChange={(_, valor) => {
            if (valor === 'ninguna' || valor === 'original' || valor === 'georef') editor.setReferenciaElegida(valor);
          }}>
            <FormControlLabel value="ninguna" control={<Radio color="success" size="small" />} label="Sin referencia de calle" />
            {(pin.referencia || pin.origen?.direccionId) && (
              <FormControlLabel value="original" control={<Radio color="success" size="small" />}
                label={pin.referencia ? referenciaTexto(pin.referencia) : 'Mantener referencia guardada'} />
            )}
            {inversa.resultado && <FormControlLabel value="georef" control={<Radio color="success" size="small" />}
              label={`${referenciaTexto(inversa.resultado)} · GeoRef`} />}
          </RadioGroup>
          <div className="trayectos-acciones">
            <Button variant="contained" color="success" onClick={editor.confirmarPin}>Confirmar punto</Button>
            <Button color="success" onClick={editor.descartarPin}>Descartar pin</Button>
          </div>
        </section>
      )}
      <a className="trayectos-atribucion" href="https://www.argentina.gob.ar/georef">Servicio GeoRef</a>

      <div className="trayectos-linea">
        <Chip size="small" label={borrador.lineaElegida ? 'Línea confirmada' : 'Línea manual'} />
        <Button variant="outlined" color="success" disabled={!editor.tieneLinea || Boolean(pin) || guardando || sugerencia.cargando}
          onClick={() => { setPanel('mapa'); void editor.calcular(); }}>
          {sugerencia.cargando ? 'Calculando…' : 'Sugerir conexión por calles'}
        </Button>
        {(sugerencia.resultado || sugerencia.cargando || borrador.lineaElegida) && (
          <Button color="success" disabled={guardando} onClick={() => editor.elegirLinea(false)}>Usar línea manual</Button>
        )}
      </div>
      {sugerencia.error && <Alert severity="warning">{sugerencia.error} Podés conservar la línea actual o seguir en modo manual.</Alert>}
      {sugerencia.resultado && (
        <Alert severity="info">
          La línea azul punteada es la sugerencia. Revisala o agregá puntos intermedios para volver a calcular.
          <small className="trayectos-atribucion">{sugerencia.resultado.fuente}</small>
          <Button color="info" disabled={Boolean(pin)} onClick={() => editor.elegirLinea(true)}>Confirmar sugerencia</Button>
          <Button color="info" onClick={() => editor.descartarSugerencia()}>Conservar línea actual</Button>
        </Alert>
      )}
      <div className="trayectos-acciones trayectos-final">
        <Button color="success" disabled={guardando} onClick={onCancelar}>Cancelar</Button>
        <Button variant="contained" color="success" disabled={guardando || Boolean(pin) || sugerencia.cargando || Boolean(sugerencia.resultado)}
          onClick={() => void editor.guardar()}>{guardando ? 'Guardando…' : 'Guardar trayecto'}</Button>
      </div>
    </Paper>
  );
}

export function PuntosTrayecto({ puntos, acciones }: {
  puntos: BorradorTrayecto['puntos'];
  acciones?: (punto: BorradorTrayecto['puntos'][number], indice: number) => React.ReactNode;
}) {
  if (puntos.length === 0) return <p>Agregá el primer punto desde el mapa o la búsqueda.</p>;
  return (
    <ol className="trayectos-puntos">
      {puntos.map((punto, indice) => (
        <li key={punto.clave}>
          <strong>{punto.referencia ? referenciaTexto(punto.referencia) : 'Sin referencia de calle'}</strong>
          <small>{punto.lat.toFixed(6)}, {punto.long.toFixed(6)}</small>
          {acciones?.(punto, indice)}
        </li>
      ))}
    </ol>
  );
}
