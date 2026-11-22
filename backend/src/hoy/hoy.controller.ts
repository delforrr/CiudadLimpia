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
import { HoyDomicilioParamsDto, MapaHoyResponseDto } from './hoy.dto';
import { HoyService } from './hoy.service';

@ApiTags('hoy')
@ApiCookieAuth('session')
@ApiBearerAuth()
@UseGuards(AuthEndpointGuard, AuthGuard('jwt'))
@Controller('api/hoy/domicilios')
export class HoyController {
  constructor(private readonly hoy: HoyService) {}

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
