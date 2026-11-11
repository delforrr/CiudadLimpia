import { useEffect, useMemo, useRef, useState } from 'react';
import { trayectosService, type Coordenadas, type Referencia, type SugerenciaTrayecto, type Trayecto, type UbicacionSugerida } from '../services/trayectosService';
import { lineaManual, prepararTrayecto, tienePosicionesDistintas, type BorradorTrayecto, type PuntoEditor } from '../utils/trayectoEditor';

type Pin = Coordenadas & { origen?: PuntoEditor; referencia?: Referencia; centrar: boolean; desdeBusqueda?: boolean };
type Consulta<T> = { cargando: boolean; error?: string; resultado?: T };

const mensaje = (error: unknown) => error instanceof Error ? error.message : 'No se pudo completar la solicitud.';

export function useTrayectoEditor(inicial: BorradorTrayecto, onGuardado: (trayecto: Trayecto) => void) {
  const [borrador, setBorrador] = useState(inicial);
  const [pin, setPin] = useState<Pin | null>(null);
  const [referenciaElegida, setReferenciaElegida] = useState<'ninguna' | 'original' | 'georef'>('ninguna');
  const [inversa, setInversa] = useState<Consulta<Referencia | null>>({ cargando: false });
  const [busqueda, setBusqueda] = useState<Consulta<{ sugerencias: UbicacionSugerida[]; fuente: string }>>({ cargando: false });
  const [calle, setCalle] = useState('');
  const [altura, setAltura] = useState('');
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
    setReferenciaElegida(nuevo.referencia || nuevo.origen?.direccionId ? 'original' : 'ninguna');
    setInversa({ cargando: true });
    try {
      const { direccionSugerida } = await trayectosService.invertir(nuevo, solicitud.signal);
      if (!solicitud.signal.aborted) setInversa({ cargando: false, resultado: direccionSugerida });
    } catch {
      if (!solicitud.signal.aborted) {
        setInversa({ cargando: false, error: 'GeoRef no pudo sugerir una dirección. Podés confirmar el pin.' });
      }
    }
  };

  const marcarEnMapa = (posicion: Coordenadas) => revisarPin({ ...pin, ...posicion, centrar: false });
  const editarPunto = (punto: PuntoEditor) => revisarPin({
    lat: punto.lat, long: punto.long, origen: punto, referencia: punto.referencia, centrar: true,
  });
  const usarUbicacion = ({ lat, long, calle, altura }: UbicacionSugerida) =>
    revisarPin({ lat, long, origen: pin?.origen, referencia: { calle, altura }, centrar: true, desdeBusqueda: true });

  const descartarPin = () => {
    solicitudPin.current?.abort();
    setPin(null);
    setInversa({ cargando: false });
  };

  const cambiarPuntos = (puntos: PuntoEditor[]) => {
    solicitudLinea.current?.abort();
    setSugerencia({ cargando: false });
    setBorrador((previo) => ({ ...previo, puntos, lineaElegida: null }));
  };

  const confirmarPin = () => {
    if (!pin) return;
    const { lat, long, origen } = pin;
    const referencia = referenciaElegida === 'georef' ? inversa.resultado ?? undefined
      : referenciaElegida === 'original' ? pin.referencia : undefined;
    const mismaPosicion = origen?.lat === lat && origen.long === long;
    const mismaReferencia = referencia?.calle === origen?.referencia?.calle && referencia?.altura === origen?.referencia?.altura;
    const direccionId = referenciaElegida === 'original' && mismaReferencia && (mismaPosicion || referencia?.altura != null)
      ? origen?.direccionId : undefined;
    const punto = { lat, long, clave: origen?.clave ?? `nuevo-${++secuencia.current}`, referencia, direccionId };
    cambiarPuntos(origen
      ? borrador.puntos.map((anterior) => anterior.clave === origen.clave ? punto : anterior)
      : [...borrador.puntos, punto]);
    if (pin.desdeBusqueda) {
      solicitudBusqueda.current?.abort();
      setCalle('');
      setAltura('');
      setBusqueda({ cargando: false });
    }
    descartarPin();
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
    setBorrador((previo) => ({ ...previo, lineaElegida }));
    descartarSugerencia();
  };

  const tieneLinea = tienePosicionesDistintas(borrador.puntos);
  const linea = useMemo(() => borrador.lineaElegida ?? lineaManual(borrador.puntos), [borrador.lineaElegida, borrador.puntos]);
  const guardar = async () => {
    if (guardando || pin || sugerencia.cargando || sugerencia.resultado) return;
    if (!borrador.nombre.trim() || !borrador.localidadId || (!borrador.lineaElegida && !tieneLinea)) {
      setError('Ingresá un nombre, elegí una localidad y confirmá al menos dos puntos distintos.');
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
    borrador, pin, inversa, referenciaElegida, setReferenciaElegida,
    marcarEnMapa, editarPunto, confirmarPin, descartarPin,
    quitarPunto: (clave: string) => cambiarPuntos(borrador.puntos.filter((punto) => punto.clave !== clave)),
    actualizarNombre: (nombre: string) => setBorrador((previo) => ({ ...previo, nombre })),
    calle, altura, busqueda, actualizarBusqueda, buscarDireccion, usarUbicacion,
    tieneLinea, linea, sugerencia, calcular, elegirLinea, descartarSugerencia, guardar, guardando, error,
  };
}
