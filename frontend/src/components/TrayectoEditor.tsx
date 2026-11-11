import { useId, useRef, useState } from 'react';
import {
  Accordion, AccordionDetails, AccordionSummary, Alert, Button, Chip, FormControlLabel, IconButton, Paper, Radio, RadioGroup, TextField,
  ToggleButton, ToggleButtonGroup,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddLocationAltOutlinedIcon from '@mui/icons-material/AddLocationAltOutlined';
import RouteOutlinedIcon from '@mui/icons-material/RouteOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import EditLocationAltOutlinedIcon from '@mui/icons-material/EditLocationAltOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlineOutlined';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useTrayectoEditor } from '../hooks/useTrayectoEditor';
import type { Referencia, Trayecto } from '../services/trayectosService';
import type { BorradorTrayecto } from '../utils/trayectoEditor';
import { TrayectoMapa } from './TrayectoMapa';

const referenciaTexto = ({ calle, altura }: Referencia) => `${calle} ${altura ?? '· sin altura'}`;

type Props = {
  inicial: BorradorTrayecto;
  onCancelar: () => void;
  onGuardado: (trayecto: Trayecto) => void;
};

export function TrayectoEditor({ inicial, onCancelar, onGuardado }: Props) {
  const editor = useTrayectoEditor(inicial, onGuardado);
  const idBusqueda = useId();
  const idPuntos = useId();
  const opciones = useRef<HTMLElement>(null);
  const [panel, setPanel] = useState<'mapa' | 'opciones'>('mapa');
  const [mostrarBusqueda, setMostrarBusqueda] = useState(false);
  const [editandoRecorrido, setEditandoRecorrido] = useState(!inicial.id);
  const { borrador, pin, inversa, busqueda, sugerencia, guardando } = editor;
  const mostrarDatos = !borrador.id || !editandoRecorrido;
  const revisionPendiente = Boolean(pin || sugerencia.cargando || sugerencia.resultado);

  const mostrarInicioOpciones = () => opciones.current?.scrollTo({ top: 0 });

  return (
    <Paper component="section" variant="outlined" className="trayectos-panel trayectos-editor" aria-label="Editor de trayectos">
      <ToggleButtonGroup className="trayectos-alternar" size="small" exclusive value={panel}
        onChange={(_, valor: typeof panel | null) => { if (valor) setPanel(valor); }} aria-label="Vista del editor">
        <ToggleButton value="mapa">Mapa</ToggleButton>
        <ToggleButton value="opciones">Opciones</ToggleButton>
      </ToggleButtonGroup>
      <div className="trayectos-espacio-mapa" data-panel={panel}>
        <div className="trayectos-mapa-editor">
          <TrayectoMapa puntos={borrador.puntos} linea={editor.linea} sugerida={sugerencia.resultado?.geometria}
            onDescartarPin={pin && !pin.origen ? editor.descartarPin : undefined}
            pin={pin} onMarcar={guardando || !editandoRecorrido ? undefined : (posicion) => {
              if (!pin) mostrarInicioOpciones();
              void editor.marcarEnMapa(posicion);
            }} />
          <div className="trayectos-mapa-pie">
            <p className={sugerencia.resultado && !pin ? 'trayectos-leyenda' : 'trayectos-ayuda'}>
              {pin ? (pin.origen ? 'Arrastrá el pin azul para mover el punto.' : 'Arrastrá el pin para moverlo o tocalo de nuevo para descartarlo.')
                : sugerencia.resultado ? 'Azul punteado · recorrido sugerido'
                  : editandoRecorrido ? 'Tocá el mapa para marcar un punto.' : 'Usá «Editar recorrido» para cambiar los puntos.'}
            </p>
            {(pin || sugerencia.resultado) && (
              <Button className="trayectos-revisar-movil" color="success" size="small"
                onClick={() => setPanel('opciones')}>{pin ? 'Revisar punto' : 'Revisar recorrido'}</Button>
            )}
          </div>
        </div>
        <aside ref={opciones} className="trayectos-opciones" aria-label="Opciones del trayecto" tabIndex={0}>
          <div className="trayectos-cabecera trayectos-cabecera-lateral">
            <div className="trayectos-identidad">
              {borrador.id && editandoRecorrido ? (
                <IconButton size="small" color="success" aria-label="Volver a los datos del trayecto"
                  title="Volver a los datos del trayecto" disabled={guardando || revisionPendiente}
                  onClick={() => setEditandoRecorrido(false)}>
                  <ArrowBackIcon fontSize="small" />
                </IconButton>
              ) : <span className="trayectos-icono"><RouteOutlinedIcon /></span>}
              <div>
                <h3>{borrador.id ? (editandoRecorrido ? 'Editar recorrido' : 'Editar trayecto') : 'Nuevo trayecto'}</h3>
                {mostrarDatos && <p className="trayectos-localidad"><PlaceOutlinedIcon />Trenque Lauquen</p>}
              </div>
            </div>
            <div className="trayectos-acciones">
              <Button color="success" disabled={guardando} onClick={onCancelar}>Cancelar</Button>
              <Button variant="contained" color="success"
                disabled={guardando || !borrador.localidadId || revisionPendiente}
                onClick={() => void editor.guardar()}>{guardando ? 'Guardando…' : 'Guardar trayecto'}</Button>
            </div>
            {editor.error && <Alert className="trayectos-error-guardado" severity="error">{editor.error}</Alert>}
          </div>
          {borrador.id && editandoRecorrido && (
            <p className="trayectos-nombre-recorrido">{borrador.nombre.trim() || 'Trayecto sin nombre'}</p>
          )}
          {borrador.id && !editandoRecorrido && (
            <Button variant="outlined" color="success" startIcon={<RouteOutlinedIcon />}
              disabled={guardando || revisionPendiente} onClick={() => {
                mostrarInicioOpciones();
                setEditandoRecorrido(true);
              }}>
              Editar recorrido
            </Button>
          )}
          {pin && (
            <section className="trayectos-revision" aria-label="Confirmar pin">
              <h4>{pin.origen ? 'Confirmar cambios del punto' : 'Confirmar nuevo punto'}</h4>
              <p className="trayectos-ayuda">Arrastrá el pin azul o tocá el mapa para ajustar su posición.</p>
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
                <Button variant="contained" color="success" startIcon={pin.origen ? undefined : <AddLocationAltOutlinedIcon />}
                  onClick={() => { editor.confirmarPin(); setPanel('mapa'); }}>
                  {pin.origen ? 'Confirmar cambios' : 'Agregar punto'}
                </Button>
                <Button color="success" onClick={() => { editor.descartarPin(); setPanel('mapa'); }}>Descartar pin</Button>
              </div>
            </section>
          )}
          {mostrarDatos && <TextField label="Nombre del trayecto" required size="small" value={borrador.nombre}
            disabled={guardando} slotProps={{ htmlInput: { maxLength: 100 } }}
            onChange={(event) => editor.actualizarNombre(event.target.value)} />}
          {!borrador.localidadId && <Alert severity="warning">Trenque Lauquen no está disponible en el catálogo de localidades.</Alert>}
          {editandoRecorrido && (
            <>
              <section className="trayectos-agregar" aria-label="Agregar puntos al recorrido">
                <div className="trayectos-encabezado">
                  <Button fullWidth color="success" size="small" startIcon={<SearchIcon />} endIcon={<ExpandMoreIcon />}
                    aria-expanded={mostrarBusqueda} aria-controls={idBusqueda}
                    onClick={() => setMostrarBusqueda((abierta) => !abierta)}>
                    Buscar por dirección
                  </Button>
                </div>
                <div id={idBusqueda} className="trayectos-busqueda-contenido" hidden={!mostrarBusqueda}>
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
                    <Button type="submit" variant="outlined" color="success" startIcon={<SearchIcon />}
                      disabled={guardando || busqueda.cargando}>
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
                            setMostrarBusqueda(false);
                            mostrarInicioOpciones();
                            void editor.usarUbicacion(ubicacion);
                          }}>
                          {referenciaTexto(ubicacion)}
                        </Button>
                      ))}
                      <small>{busqueda.resultado.fuente}</small>
                    </div>
                  )}
                  <a className="trayectos-atribucion" href="https://www.argentina.gob.ar/georef">Servicio GeoRef</a>
                </div>
              </section>
              <section className="trayectos-trazado" aria-label="Trazado del recorrido">
                <h4>Trazado del recorrido</h4>
                <div className="trayectos-linea">
                  <Chip size="small" label={borrador.lineaElegida ? 'Línea confirmada' : 'Línea manual'} />
                  <Button variant="outlined" color="success" startIcon={<RouteOutlinedIcon />}
                    disabled={!editor.tieneLinea || Boolean(pin) || guardando || sugerencia.cargando}
                    onClick={() => void editor.calcular()}>
                    {sugerencia.cargando ? 'Calculando…' : 'Sugerir recorrido por calles'}
                  </Button>
                  {(sugerencia.resultado || sugerencia.cargando || borrador.lineaElegida) && (
                    <Button color="success" disabled={guardando} onClick={() => editor.elegirLinea(false)}>Usar línea manual</Button>
                  )}
                </div>
                {sugerencia.error && <Alert severity="warning">{sugerencia.error} Podés conservar la línea actual o seguir en modo manual.</Alert>}
                {sugerencia.resultado && (
                  <Alert severity="info">
                    Revisá el recorrido en el mapa antes de confirmarlo.
                    <small className="trayectos-atribucion">{sugerencia.resultado.fuente}</small>
                    <Button color="info" disabled={Boolean(pin)} onClick={() => editor.elegirLinea(true)}>Confirmar sugerencia</Button>
                    <Button color="info" onClick={() => editor.descartarSugerencia()}>Conservar línea actual</Button>
                  </Alert>
                )}
              </section>
              <Accordion className="trayectos-puntos-desplegable" disableGutters variant="outlined"
                slotProps={{ transition: { unmountOnExit: true } }}>
                <AccordionSummary id={`${idPuntos}-titulo`} aria-controls={`${idPuntos}-contenido`} expandIcon={<ExpandMoreIcon />}>
                  <span>Puntos de paso</span>
                  <Chip size="small" label={borrador.puntos.length} aria-label={`${borrador.puntos.length} puntos confirmados`} />
                </AccordionSummary>
                <AccordionDetails>
                  <PuntosTrayecto puntos={borrador.puntos} acciones={(punto, indice) => (
                    <div className="trayectos-punto-acciones">
                      <IconButton size="small" color="success" title="Mover" disabled={guardando || Boolean(pin)}
                        onClick={() => {
                          mostrarInicioOpciones();
                          setPanel('mapa');
                          void editor.editarPunto(punto);
                        }} aria-label={`Mover punto ${indice + 1} en el mapa`}>
                        <EditLocationAltOutlinedIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="error" title="Quitar" disabled={guardando || Boolean(pin)}
                        onClick={() => editor.quitarPunto(punto.clave)} aria-label={`Quitar punto ${indice + 1}`}>
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </div>
                  )} />
                </AccordionDetails>
              </Accordion>
            </>
          )}
        </aside>
      </div>
    </Paper>
  );
}

export function PuntosTrayecto({ puntos, acciones }: {
  puntos: BorradorTrayecto['puntos'];
  acciones?: (punto: BorradorTrayecto['puntos'][number], indice: number) => React.ReactNode;
}) {
  if (puntos.length === 0) return <p className="trayectos-sin-puntos">Agregá dos puntos para dibujar el recorrido.</p>;
  return (
    <ol className="trayectos-puntos" role="list">
      {puntos.map((punto, indice) => (
        <li key={punto.clave}>
          <span className="trayectos-numero" aria-hidden="true">{indice + 1}</span>
          <div className="trayectos-punto-datos">
            <strong>{punto.referencia ? referenciaTexto(punto.referencia) : 'Sin referencia de calle'}</strong>
            <small>{punto.lat.toFixed(6)}, {punto.long.toFixed(6)}</small>
          </div>
          {acciones?.(punto, indice)}
        </li>
      ))}
    </ol>
  );
}
