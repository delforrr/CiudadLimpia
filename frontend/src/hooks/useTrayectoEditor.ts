import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { trayectosService, type Coordenadas, type LadoRecoleccion, type Referencia, type SugerenciaTrayecto, type Trayecto, type UbicacionSugerida } from '../services/trayectosService';
import type { CalleCatalogo } from '../services/callesService';
import { completarAltura, lineaManual, prepararTrayecto, tienePosicionesDistintas, type BorradorTrayecto, type PuntoEditor } from '../utils/trayectoEditor';
import { reducirBorrador } from '../utils/borradorTrayecto';
import type { Zona } from '../services/zonasService';
import { dividirTramo, tramosDeLinea, type TramoEditor } from '../utils/tramosTrayecto';

type Pin = Coordenadas & { origen?: PuntoEditor; referencia?: Referencia };
type Consulta<T> = { cargando: boolean; error?: string; resultado?: T };
type ReferenciaElegida = 'original' | 'georef' | null;

const mensaje = (error: unknown) => error instanceof Error ? error.message : 'No se pudo completar la solicitud.';

export function useTrayectoEditor(inicial: BorradorTrayecto, onGuardado: (trayecto: Trayecto) => void, zonas: Zona[]) {
  const [{ borrador, revisarCobertura }, modificar] = useReducer(reducirBorrador, { borrador: inicial, revisarCobertura: false });
  const [pin, setPin] = useState<Pin | null>(null);
  const [centrarEn, setCentrarEn] = useState<Coordenadas | null>(null);
  const [referenciaElegida, setReferenciaElegida] = useState<ReferenciaElegida>(null);
  const [inversa, setInversa] = useState<Consulta<Referencia | null>>({ cargando: false });
  const [busqueda, setBusqueda] = useState<Consulta<{ sugerencias: UbicacionSugerida[]; fuente: string }>>({ cargando: false });
  const [calle, setCalle] = useState('');
  const [altura, setAltura] = useState('');
  const [alturaManual, setAlturaManual] = useState('');
  const [errorAlturaManual, setErrorAlturaManual] = useState('');
  const [errorReferencia, setErrorReferencia] = useState('');
  const [sugerencia, setSugerencia] = useState<Consulta<SugerenciaTrayecto>>({ cargando: false });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const solicitudPin = useRef<AbortController | null>(null);
  const solicitudBusqueda = useRef<AbortController | null>(null);
  const solicitudLinea = useRef<AbortController | null>(null);
  const secuencia = useRef(0);

  useEffect(() => () => {
    solicitudPin.current?.abort();
    solicitudBusqueda.current?.abort();
    solicitudLinea.current?.abort();
  }, []);

  const revisarPin = async (nuevo: Pin) => {
    solicitudPin.current?.abort();
    const solicitud = new AbortController();
    solicitudPin.current = solicitud;
    setPin(nuevo);
    setAlturaManual('');
    setErrorAlturaManual('');
    setErrorReferencia('');
    setReferenciaElegida(nuevo.referencia || nuevo.origen?.direccionId ? 'original' : null);
    setInversa({ cargando: true });
    try {
      const { direccionSugerida } = await trayectosService.invertir(nuevo, solicitud.signal);
      if (!solicitud.signal.aborted) {
        setInversa({ cargando: false, resultado: direccionSugerida });
        setReferenciaElegida((actual) => actual ?? (direccionSugerida ? 'georef' : null));
      }
    } catch {
      if (!solicitud.signal.aborted) {
        setInversa({ cargando: false, error: 'GeoRef no pudo sugerir una dirección. Podés confirmar el pin.' });
      }
    }
  };

  const marcarEnMapa = (posicion: Coordenadas) => revisarPin({ ...pin, ...posicion });
  const editarPunto = (punto: PuntoEditor) => revisarPin({
    lat: punto.lat, long: punto.long, origen: punto, referencia: punto.referencia,
  });

  const descartarPin = () => {
    solicitudPin.current?.abort();
    setPin(null);
    setInversa({ cargando: false });
    setErrorReferencia('');
  };

  const cambiarPuntos = (puntos: PuntoEditor[]) => {
    solicitudLinea.current?.abort();
    setSugerencia({ cargando: false });
    modificar({ tipo: 'puntos', puntos });
  };

  const aplicarPunto = (datos: Omit<PuntoEditor, 'clave'>, origen?: PuntoEditor) => {
    const punto = { ...datos, clave: origen?.clave ?? `nuevo-${++secuencia.current}` };
    cambiarPuntos(origen
      ? borrador.puntos.map((anterior) => anterior.clave === origen.clave ? punto : anterior)
      : [...borrador.puntos, punto]);
    descartarPin();
  };

  const usarUbicacion = ({ lat, long, calle, altura }: UbicacionSugerida) => {
    const posicion = { lat, long };
    if (altura === null) {
      void revisarPin({ ...posicion, referencia: { calle, altura }, origen: pin?.origen });
    } else {
      aplicarPunto({ ...posicion, referencia: { calle, altura } }, pin?.origen);
    }
    setCentrarEn(posicion);
    solicitudBusqueda.current?.abort();
    setCalle('');
    setAltura('');
    setBusqueda({ cargando: false });
  };

  const confirmarPin = () => {
    if (!pin) return false;
    const { lat, long, origen } = pin;
    if (!referenciaElegida) {
      setErrorReferencia('Elegí una calle de referencia antes de confirmar el punto.');
      return false;
    }
    let referencia = referenciaElegida === 'georef' ? inversa.resultado ?? undefined
      : pin.referencia;
    if (!referencia) {
      setErrorReferencia('No hay una calle de referencia para este punto. Buscala por calle y altura.');
      return false;
    }
    setErrorReferencia('');
    try {
      if (referencia) referencia = completarAltura(referencia, alturaManual);
    } catch (error) {
      setErrorAlturaManual(mensaje(error));
      return false;
    }
    const mismaPosicion = origen?.lat === lat && origen.long === long;
    const mismaReferencia = referencia?.calle === origen?.referencia?.calle && referencia?.altura === origen?.referencia?.altura;
    const direccionId = referenciaElegida === 'original' && mismaReferencia && (mismaPosicion || referencia?.altura != null)
      ? origen?.direccionId : undefined;
    aplicarPunto({ lat, long, referencia, direccionId }, origen);
    return true;
  };

  const actualizarBusqueda = (campo: 'calle' | 'altura', valor: string) => {
    solicitudBusqueda.current?.abort();
    setBusqueda({ cargando: false });
    (campo === 'calle' ? setCalle : setAltura)(valor);
  };

  const buscarDireccion = async () => {
    const numero = Number(altura);
    if (!calle.trim() || !/^\d+$/.test(altura.trim()) || numero < 1 || numero > 2147483647) {
      setBusqueda({ cargando: false, error: 'Ingresá una calle y una altura válida para buscar.' });
      return;
    }
    solicitudBusqueda.current?.abort();
    const solicitud = new AbortController();
    solicitudBusqueda.current = solicitud;
    setBusqueda({ cargando: true });
    try {
      const resultado = await trayectosService.buscar(calle.trim(), numero, solicitud.signal);
      if (!solicitud.signal.aborted) setBusqueda({ cargando: false, resultado });
    } catch {
      if (!solicitud.signal.aborted) {
        setBusqueda({ cargando: false, error: 'No se pudo buscar la dirección. Podés marcar el punto en el mapa.' });
      }
    }
  };

  const calcular = async () => {
    solicitudLinea.current?.abort();
    const solicitud = new AbortController();
    solicitudLinea.current = solicitud;
    setSugerencia({ cargando: true });
    try {
      const resultado = await trayectosService.sugerir(borrador.puntos, solicitud.signal);
      if (!solicitud.signal.aborted) setSugerencia({ cargando: false, resultado });
    } catch (error) {
      if (!solicitud.signal.aborted) setSugerencia({ cargando: false, error: mensaje(error) });
    }
  };

  const descartarSugerencia = () => {
    solicitudLinea.current?.abort();
    setSugerencia({ cargando: false });
  };

  const elegirLinea = (usarSugerencia: boolean) => {
    const lineaElegida = usarSugerencia ? sugerencia.resultado?.geometria ?? null : null;
    modificar({ tipo: 'linea', linea: lineaElegida });
    descartarSugerencia();
  };

  const tieneLinea = tienePosicionesDistintas(borrador.puntos);
  const linea = useMemo(() => borrador.lineaElegida ?? lineaManual(borrador.puntos), [borrador.lineaElegida, borrador.puntos]);
  const tramos = useMemo(() => tramosDeLinea(linea, borrador), [linea, borrador]);

  const asignarCalle = (tramo: TramoEditor, calle: CalleCatalogo | null) =>
    modificar({ tipo: 'calle', tramo, calle });

  const cambiarLado = (desde: number, lado: LadoRecoleccion) =>
    modificar({ tipo: 'lado', desde, lado });

  const cortarTramo = (tramo: TramoEditor, posicion: Coordenadas) => {
    const corte = dividirTramo(linea, tramo, posicion);
    if (!corte) return;
    modificar({ tipo: 'corte', desde: tramo.desde, corte });
    return corte.indice;
  };

  const guardar = async () => {
    if (guardando || pin || sugerencia.cargando || sugerencia.resultado) return;
    const zonaId = borrador.zonaId;
    if (!zonaId || !zonas.some((zona) => zona.id === zonaId)) {
      setError('Elegí una zona para el trayecto. Si todavía no hay zonas, creá una desde el apartado Zonas.');
      return;
    }
    if (!borrador.nombre.trim() || !borrador.localidadId || (!borrador.lineaElegida && !tieneLinea)) {
      setError('Ingresá un nombre, elegí una localidad y confirmá al menos dos puntos distintos.');
      return;
    }
    if (tramos.length === 0 || tramos.some((tramo) => !tramo.calle)) {
      setError('Asigná una calle a cada tramo del recorrido antes de guardar.');
      return;
    }
    setGuardando(true);
    setError('');
    try {
      onGuardado(await trayectosService.guardar(prepararTrayecto(borrador), borrador.id));
    } catch (error) {
      setError(mensaje(error));
    } finally {
      setGuardando(false);
    }
  };

  return {
    borrador, pin, centrarEn, inversa, referenciaElegida,
    setReferenciaElegida: (valor: ReferenciaElegida) => {
      setReferenciaElegida(valor);
      setAlturaManual('');
      setErrorAlturaManual('');
      setErrorReferencia('');
    },
    puedeCompletarAltura: (referenciaElegida === 'original' ? pin?.referencia : inversa.resultado)?.altura === null,
    alturaManual, errorAlturaManual, errorReferencia,
    actualizarAlturaManual: (valor: string) => {
      setAlturaManual(valor);
      setErrorAlturaManual('');
    },
    marcarEnMapa, editarPunto, confirmarPin, descartarPin,
    quitarPunto: (clave: string) => cambiarPuntos(borrador.puntos.filter((punto) => punto.clave !== clave)),
    actualizarNombre: (nombre: string) => modificar({ tipo: 'nombre', nombre }),
    actualizarZona: (zonaId: string) => modificar({ tipo: 'zona', zonaId }),
    calle, altura, busqueda, actualizarBusqueda, buscarDireccion, usarUbicacion,
    tieneLinea, linea, sugerencia, calcular, elegirLinea, descartarSugerencia, guardar, guardando, error,
    tramos, asignarCalle, cambiarLado, cortarTramo, revisarCobertura,
  };
}
