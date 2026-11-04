import {
  BadGatewayException,
  GatewayTimeoutException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  GEOREF_FUENTE,
  GeocodificacionDirectaQuery,
  GeocodificacionDirectaResponse,
  GeocodificacionInversaQuery,
  GeocodificacionInversaResponse,
} from './geocodificacion.dto';

const GEOREF = 'https://apis.datos.gob.ar/georef/api/v2.0/';
const LOCALIDAD_CENSAL = '06826050';

function objeto(value: unknown): Record<string, unknown> | undefined {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
}

function calleValida(value: unknown): value is string {
  return (
    typeof value === 'string' && value.trim().length > 0 && value.length <= 180
  );
}

function alturaValida(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value > 0 &&
    value <= 2147483647
  );
}

function coordenadaValida(value: unknown, max: number): value is number {
  return typeof value === 'number' && Math.abs(value) <= max;
}

@Injectable()
export class GeocodificacionService {
  async directa({
    calle,
    altura,
  }: GeocodificacionDirectaQuery): Promise<GeocodificacionDirectaResponse> {
    const datos = await this.consultar('direcciones', {
      direccion: `${calle} ${altura}`,
      provincia: '06',
      departamento: '06826',
      localidad_censal: LOCALIDAD_CENSAL,
      campos: 'completo',
      max: '10',
    });
    if (!Array.isArray(datos?.direcciones)) {
      throw new BadGatewayException('Respuesta inválida de Georef');
    }

    const sugerencias: GeocodificacionDirectaResponse['sugerencias'] = [];
    for (const resultado of datos.direcciones as unknown[]) {
      const direccion = objeto(resultado);
      if (objeto(direccion?.localidad_censal)?.id !== LOCALIDAD_CENSAL)
        continue;
      const calle = objeto(direccion?.calle)?.nombre;
      const altura = objeto(direccion?.altura)?.valor;
      const ubicacion = objeto(direccion?.ubicacion);
      const lat = ubicacion?.lat;
      const long = ubicacion?.lon;
      if (
        !calleValida(calle) ||
        !alturaValida(altura) ||
        !coordenadaValida(lat, 90) ||
        !coordenadaValida(long, 180)
      )
        continue;
      if (
        sugerencias.some(
          (item) => item.calle === calle && item.altura === altura,
        )
      )
        continue;
      sugerencias.push({ calle, altura, lat, long });
      if (sugerencias.length === 3) break;
    }
    return { sugerencias, fuente: GEOREF_FUENTE };
  }

  async inversa({
    lat,
    long,
  }: GeocodificacionInversaQuery): Promise<GeocodificacionInversaResponse> {
    const datos = await this.consultar('ubicacion', {
      lat: String(lat),
      lon: String(long),
      campos: 'completo',
    });
    const ubicacion = objeto(datos?.ubicacion);
    if (!ubicacion)
      throw new BadGatewayException('Respuesta inválida de Georef');

    const calle = objeto(ubicacion.calle);
    const nombre = calle?.nombre;
    const id = calle?.id;
    const altura = calle?.altura;
    // Georef incluye la localidad censal en el prefijo del código de calle.
    const direccionSugerida =
      typeof id === 'string' &&
      id.startsWith(LOCALIDAD_CENSAL) &&
      calleValida(nombre)
        ? { calle: nombre, altura: alturaValida(altura) ? altura : null }
        : null;
    return { lat, long, direccionSugerida, fuente: GEOREF_FUENTE };
  }

  private async consultar(recurso: string, parametros: Record<string, string>) {
    const url = new URL(recurso, GEOREF);
    url.search = new URLSearchParams(parametros).toString();
    const signal = AbortSignal.timeout(5000);
    const respuesta = await fetch(url, { signal }).catch(() => {
      if (signal.aborted)
        throw new GatewayTimeoutException('Georef no respondió a tiempo');
      throw new ServiceUnavailableException('Georef no está disponible');
    });
    if (respuesta.status === 429 || respuesta.status >= 500) {
      throw new ServiceUnavailableException('Georef no está disponible');
    }
    if (!respuesta.ok)
      throw new BadGatewayException('Respuesta inválida de Georef');

    const datos: unknown = await respuesta.json().catch(() => {
      if (signal.aborted)
        throw new GatewayTimeoutException('Georef no respondió a tiempo');
      throw new BadGatewayException('Respuesta inválida de Georef');
    });
    return objeto(datos);
  }
}
