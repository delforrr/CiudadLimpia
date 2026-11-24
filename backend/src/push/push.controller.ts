import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  ParseUUIDPipe,
  Put,
  Req,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiCookieAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthEndpointGuard } from '../auth/auth-endpoint.guard';
import type { AuthRequest } from '../auth/auth.guard';
import {
  ConfiguracionPushDto,
  EndpointPushDto,
  EstadoSuscripcionPushDto,
  GuardarSuscripcionPushDto,
  SuscripcionPushResponseDto,
} from './push.dto';
import { PushService } from './push.service';

@ApiTags('push')
@ApiBearerAuth()
@ApiCookieAuth('session')
@ApiResponse({ status: 401, description: 'Sesión ausente o inválida.' })
@UseGuards(AuthEndpointGuard, AuthGuard('jwt'))
@Controller('api/push')
export class PushController {
  constructor(
    private readonly push: PushService,
    private readonly config: ConfigService,
  ) {}

  @Get('configuracion')
  @ApiOkResponse({ type: ConfiguracionPushDto })
  @ApiResponse({ status: 503, description: 'Web Push no está configurado.' })
  configuracion(): ConfiguracionPushDto {
    const clavePublica = this.config.get<string>('PUSH_VAPID_PUBLICA');
    if (!clavePublica)
      throw new ServiceUnavailableException('Web Push no está configurado');
    return { clavePublica };
  }

  @Put('suscripciones')
  @ApiConsumes('application/json')
  @ApiOkResponse({ type: SuscripcionPushResponseDto })
  @ApiResponse({ status: 400, description: 'Suscripción inválida.' })
  @ApiResponse({ status: 404, description: 'Domicilio no encontrado.' })
  @ApiResponse({ status: 409, description: 'Endpoint registrado.' })
  @ApiResponse({ status: 415, description: 'Se requiere application/json.' })
  guardar(@Req() req: AuthRequest, @Body() dto: GuardarSuscripcionPushDto) {
    return this.push.guardarSuscripcion(req.user.id, dto);
  }

  @Post('suscripciones/estado')
  @HttpCode(200)
  @ApiConsumes('application/json')
  @ApiOkResponse({ type: EstadoSuscripcionPushDto })
  async estado(@Req() req: AuthRequest, @Body() dto: EndpointPushDto) {
    return {
      suscripcion: await this.push.consultarEndpoint(req.user.id, dto.endpoint),
    };
  }

  @Get('suscripciones/:id')
  @ApiOkResponse({ type: SuscripcionPushResponseDto })
  @ApiResponse({ status: 400, description: 'Identificador inválido.' })
  @ApiResponse({ status: 404, description: 'Suscripción no encontrada.' })
  consultar(@Req() req: AuthRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.push.consultarSuscripcion(req.user.id, id);
  }

  @Delete('suscripciones/:id')
  @HttpCode(204)
  @ApiConsumes('application/json')
  @ApiNoContentResponse()
  @ApiResponse({ status: 400, description: 'Identificador inválido.' })
  @ApiResponse({ status: 404, description: 'Suscripción no encontrada.' })
  @ApiResponse({ status: 415, description: 'Se requiere application/json.' })
  eliminar(@Req() req: AuthRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.push.eliminarSuscripcion(req.user.id, id);
  }
}
