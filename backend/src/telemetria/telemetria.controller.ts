import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiNoContentResponse,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { createHash, timingSafeEqual } from 'node:crypto';
import { AuthEndpointGuard } from '../auth/auth-endpoint.guard';
import { PosicionTelemetriaDto } from './telemetria.dto';
import { TelemetriaService } from './telemetria.service';

const hash = (valor: string) => createHash('sha256').update(valor).digest();

@ApiTags('telemetría')
@ApiBearerAuth('telemetria')
@UseGuards(AuthEndpointGuard)
@Controller('api/telemetria')
export class TelemetriaController {
  constructor(
    private readonly telemetria: TelemetriaService,
    private readonly config: ConfigService,
  ) {}

  @Post('posiciones')
  @HttpCode(204)
  @ApiConsumes('application/json')
  @ApiNoContentResponse()
  @ApiResponse({ status: 400, description: 'Muestra inválida.' })
  @ApiResponse({
    status: 401,
    description: 'Credencial de proveedor inválida.',
  })
  @ApiResponse({
    status: 404,
    description: 'Camión activo o trayecto no encontrado.',
  })
  @ApiResponse({
    status: 409,
    description: 'Prestación vinculada con otros identificadores.',
  })
  @ApiResponse({ status: 415, description: 'Se requiere application/json.' })
  async registrar(
    @Headers('authorization') autorizacion: string | undefined,
    @Body() dto: PosicionTelemetriaDto,
  ) {
    const token = this.config.get<string>('TELEMETRIA_TOKEN');
    const proveedor = this.config.get<string>('TELEMETRIA_PROVEEDOR_ID');
    if (
      !token ||
      !proveedor ||
      !autorizacion ||
      !timingSafeEqual(hash(`Bearer ${token}`), hash(autorizacion))
    ) {
      throw new UnauthorizedException('Credencial de proveedor inválida');
    }
    await this.telemetria.registrarPosicion(proveedor, dto);
  }
}
