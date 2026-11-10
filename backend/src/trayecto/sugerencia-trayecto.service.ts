import {
  BadGatewayException,
  GatewayTimeoutException,
  Injectable,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { types } from 'node:util';
import { esLineaValida } from './line-string';
import type { SugerenciaTrayectoDto } from './sugerencia-trayecto.dto';
import type { CoordenadasTrayectoDto } from './trayecto.dto';

const demoOsrm = 'https://routing.openstreetmap.de/routed-car/';
const continuarManual = 'Podés dibujar el trayecto manualmente.';

@Injectable()
export class SugerenciaTrayectoService {
  private ultimaConsultaDemo = -Infinity;

  constructor(private readonly config: ConfigService) {}

  async sugerir(
    puntos: CoordenadasTrayectoDto[],
  ): Promise<SugerenciaTrayectoDto> {
    const base =
      this.config.get<string>('OSRM_BASE_URL')?.trim() ||
      (this.config.get('NODE_ENV') !== 'production' ? demoOsrm : undefined);
    if (!base)
      throw new ServiceUnavailableException(
        `El motor de rutas no está configurado. ${continuarManual}`,
      );

    const posiciones = puntos
      .map(({ lat, long }) => `${long},${lat}`)
      .join(';');
    const url = URL.parse(
      `route/v1/driving/${posiciones}?overview=full&geometries=geojson`,
      `${base.replace(/\/$/, '')}/`,
    );
    if (!url || !['http:', 'https:'].includes(url.protocol))
      throw new ServiceUnavailableException(
        `El motor de rutas tiene una configuración inválida. ${continuarManual}`,
      );

    if (url.hostname === 'routing.openstreetmap.de') {
      const ahora = performance.now();
      // shortcut: límite por proceso de desarrollo, usar un OSRM propio para varias instancias.
      if (ahora - this.ultimaConsultaDemo < 1000)
        throw new ServiceUnavailableException(
          `El motor de rutas alcanzó su límite. Reintentá en un segundo. ${continuarManual}`,
        );
      this.ultimaConsultaDemo = ahora;
    }

    const signal = AbortSignal.timeout(5000);
    let datos:
      { code?: unknown; routes?: { geometry?: unknown }[] } | null | undefined;
    let respuesta: Response;
    try {
      respuesta = await fetch(url, {
        headers: { 'User-Agent': 'CiudadLimpia/1.0' },
        redirect: 'error',
        signal,
      });
      if (respuesta.ok || respuesta.status === 400)
        datos = (await respuesta.json()) as typeof datos;
      else await respuesta.body?.cancel();
    } catch (error) {
      if (signal.aborted)
        throw new GatewayTimeoutException(
          `El motor de rutas no respondió a tiempo. ${continuarManual}`,
        );
      if (types.isNativeError(error) && error.name === 'SyntaxError')
        throw new BadGatewayException(
          `El motor de rutas devolvió una sugerencia inválida. ${continuarManual}`,
        );
      throw new ServiceUnavailableException(
        `El motor de rutas no está disponible. ${continuarManual}`,
      );
    }

    if (respuesta.status >= 500 || respuesta.status === 429)
      throw new ServiceUnavailableException(
        `El motor de rutas no está disponible. ${continuarManual}`,
      );
    if (datos?.code === 'NoRoute' || datos?.code === 'NoSegment')
      throw new UnprocessableEntityException(
        'No se encontró una conexión por calles. Podés dibujarla manualmente.',
      );
    if (datos?.code === 'TooBig')
      throw new UnprocessableEntityException(
        `El motor de rutas no admite tantos puntos. ${continuarManual}`,
      );

    const geometria = Array.isArray(datos?.routes)
      ? datos.routes[0]?.geometry
      : undefined;
    if (!respuesta.ok || datos?.code !== 'Ok' || !esLineaValida(geometria))
      throw new BadGatewayException(
        `El motor de rutas devolvió una sugerencia inválida. ${continuarManual}`,
      );
    const { type, coordinates } = geometria;
    return {
      geometria: { type, coordinates },
      fuente: 'OSRM · © colaboradores de OpenStreetMap',
    };
  }
}
