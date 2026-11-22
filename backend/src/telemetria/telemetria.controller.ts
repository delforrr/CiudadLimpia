import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { createHash, timingSafeEqual } from 'node:crypto';
import { AuthEndpointGuard } from '../auth/auth-endpoint.guard';
import { AvisosTelemetriaDto, PosicionTelemetriaDto } from './telemetria.dto';
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
    await this.telemetria.registrarPosicion(this.autenticar(autorizacion), dto);
  }

  @Get('servicios/:servicioId/avisos')
  @ApiOkResponse({ type: AvisosTelemetriaDto })
  @ApiResponse({
    status: 401,
    description: 'Credencial de proveedor inválida.',
  })
  avisos(
    @Headers('authorization') autorizacion: string | undefined,
    @Param('servicioId', ParseUUIDPipe) servicioId: string,
  ) {
    return this.telemetria.consultarAvisos(
      this.autenticar(autorizacion),
      servicioId,
    );
  }

  private autenticar(autorizacion: string | undefined) {
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
    return proveedor;
  }
}
