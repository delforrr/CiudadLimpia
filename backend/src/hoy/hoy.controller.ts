import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiOkResponse,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthEndpointGuard } from '../auth/auth-endpoint.guard';
import type { AuthRequest } from '../auth/auth.guard';
import {
  CamionHoyDto,
  HoyDomicilioParamsDto,
  MapaHoyResponseDto,
  TrayectosHoyResponseDto,
} from './hoy.dto';
import { HoyService } from './hoy.service';

@ApiTags('hoy')
@ApiCookieAuth('session')
@ApiBearerAuth()
@UseGuards(AuthEndpointGuard, AuthGuard('jwt'))
@Controller('api/hoy/domicilios')
export class HoyController {
  constructor(private readonly hoy: HoyService) {}

  @Get(':direccionId/trayectos')
  @ApiOkResponse({ type: TrayectosHoyResponseDto })
  consultarTrayectos(
    @Req() req: AuthRequest,
    @Param() { direccionId }: HoyDomicilioParamsDto,
  ) {
    return this.hoy.consultarTrayectos(req.user.id, direccionId);
  }

  @Get(':direccionId/camiones')
  @ApiOkResponse({ type: [CamionHoyDto] })
  async consultarCamiones(
    @Req() req: AuthRequest,
    @Param() { direccionId }: HoyDomicilioParamsDto,
  ) {
    const { camiones } = await this.hoy.consultarMapa(req.user.id, direccionId);
    return camiones;
  }

  @Get(':direccionId/mapa')
  @ApiOkResponse({ type: MapaHoyResponseDto })
  @ApiResponse({ status: 400, description: 'Identificador inválido.' })
  @ApiResponse({ status: 401, description: 'Sesión ausente o inválida.' })
  @ApiResponse({ status: 404, description: 'Domicilio no encontrado.' })
  consultar(
    @Req() req: AuthRequest,
    @Param() { direccionId }: HoyDomicilioParamsDto,
  ): Promise<MapaHoyResponseDto> {
    return this.hoy.consultarMapa(req.user.id, direccionId);
  }
}
