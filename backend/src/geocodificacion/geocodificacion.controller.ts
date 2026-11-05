import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBadGatewayResponse,
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCookieAuth,
  ApiForbiddenResponse,
  ApiGatewayTimeoutResponse,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { Role } from '../generated/prisma/enums';
import {
  GeocodificacionDirectaQuery,
  GeocodificacionDirectaResponse,
  GeocodificacionInversaQuery,
  GeocodificacionInversaResponse,
} from './geocodificacion.dto';
import { GeocodificacionService } from './geocodificacion.service';

@ApiTags('geocodificacion')
@ApiCookieAuth('session')
@ApiBearerAuth()
@ApiBadRequestResponse({ description: 'Parámetros inválidos.' })
@ApiUnauthorizedResponse({ description: 'Sesión ausente o inválida.' })
@ApiForbiddenResponse({ description: 'Se requiere el rol ADMIN.' })
@ApiBadGatewayResponse({ description: 'Respuesta inválida de Georef.' })
@ApiServiceUnavailableResponse({
  description: 'Georef no está disponible o se agotó la cuota.',
})
@ApiGatewayTimeoutResponse({ description: 'Georef no respondió a tiempo.' })
@Roles([Role.ADMIN])
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('geocodificacion')
export class GeocodificacionController {
  constructor(private readonly geocodificacion: GeocodificacionService) {}

  @Get('directa')
  @ApiOperation({
    summary: 'Buscar hasta tres ubicaciones aproximadas por calle y altura',
    description:
      'Una coincidencia exacta con coordenadas en el catálogo público tiene prioridad. Si falta, se consulta Georef. Una lista vacía indica que no hay una ubicación sugerida.',
  })
  @ApiOkResponse({ type: GeocodificacionDirectaResponse })
  directa(@Query() query: GeocodificacionDirectaQuery) {
    return this.geocodificacion.directa(query);
  }

  @Get('inversa')
  @ApiOperation({
    summary: 'Sugerir una dirección para un pin en Trenque Lauquen',
    description:
      'Consulta Georef y devuelve las coordenadas del pin original. La sugerencia puede incluir solo la calle. Si falta una calle de la ciudad, direccionSugerida es null.',
  })
  @ApiOkResponse({ type: GeocodificacionInversaResponse })
  inversa(@Query() query: GeocodificacionInversaQuery) {
    return this.geocodificacion.inversa(query);
  }
}
