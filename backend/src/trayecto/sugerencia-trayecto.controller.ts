import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBadGatewayResponse,
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiCookieAuth,
  ApiForbiddenResponse,
  ApiGatewayTimeoutResponse,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
  ApiUnsupportedMediaTypeResponse,
} from '@nestjs/swagger';
import { AuthEndpointGuard } from '../auth/auth-endpoint.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { Role } from '../generated/prisma/enums';
import {
  SugerenciaTrayectoDto,
  SugerirTrayectoDto,
} from './sugerencia-trayecto.dto';
import { SugerenciaTrayectoService } from './sugerencia-trayecto.service';

@ApiTags('trayectos')
@ApiCookieAuth('session')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Sesión ausente o inválida.' })
@ApiForbiddenResponse({ description: 'Se requiere el rol ADMIN.' })
@Roles([Role.ADMIN])
@UseGuards(AuthEndpointGuard, AuthGuard('jwt'), RolesGuard)
@Controller('api/trayectos')
export class SugerenciaTrayectoController {
  constructor(private readonly sugerencia: SugerenciaTrayectoService) {}

  @Post('sugerencia')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Sugerir una línea vial para puntos ordenados',
    description: 'Calcula una línea para revisar sin guardar cambios.',
  })
  @ApiConsumes('application/json')
  @ApiOkResponse({ type: SugerenciaTrayectoDto })
  @ApiBadRequestResponse({ description: 'Puntos inválidos.' })
  @ApiUnsupportedMediaTypeResponse({
    description: 'Se requiere application/json.',
  })
  @ApiUnprocessableEntityResponse({
    description:
      'No hay una conexión vial para los puntos indicados o se superó el límite del motor.',
  })
  @ApiBadGatewayResponse({
    description: 'El motor devolvió una línea inválida.',
  })
  @ApiServiceUnavailableResponse({
    description: 'El motor de rutas no está disponible o alcanzó su cuota.',
  })
  @ApiGatewayTimeoutResponse({ description: 'El motor no respondió a tiempo.' })
  sugerir(@Body() { puntos }: SugerirTrayectoDto) {
    return this.sugerencia.sugerir(puntos);
  }
}
