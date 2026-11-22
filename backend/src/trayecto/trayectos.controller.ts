import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnsupportedMediaTypeResponse,
} from '@nestjs/swagger';
import { ApiConflictoPin } from '../direccion/dto/direccion-response.dto';
import { AuthEndpointGuard } from '../auth/auth-endpoint.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { Role } from '../generated/prisma/enums';
import { CreateTrayectoDto, TrayectoResponseDto } from './trayecto.dto';
import { TrayectosService } from './trayectos.service';

@ApiTags('trayectos')
@ApiCookieAuth('session')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Sesión ausente o inválida.' })
@ApiForbiddenResponse({ description: 'Se requiere el rol ADMIN.' })
@Roles([Role.ADMIN])
@UseGuards(AuthEndpointGuard, AuthGuard('jwt'), RolesGuard)
@Controller('api/trayectos')
export class TrayectosController {
  constructor(private readonly trayectos: TrayectosService) {}

  @Get()
  @ApiOperation({ summary: 'Listar los trayectos guardados' })
  @ApiOkResponse({ type: [TrayectoResponseDto] })
  findAll() {
    return this.trayectos.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consultar un trayecto con sus puntos y línea' })
  @ApiOkResponse({ type: TrayectoResponseDto })
  @ApiBadRequestResponse({ description: 'Identificador inválido.' })
  @ApiNotFoundResponse({ description: 'Trayecto no encontrado.' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.trayectos.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Guardar un trayecto y su línea confirmada' })
  @ApiConsumes('application/json')
  @ApiCreatedResponse({ type: TrayectoResponseDto })
  @ApiBadRequestResponse({
    description:
      'Datos inválidos, localidad inexistente o referencia inexistente.',
  })
  @ApiConflictoPin(
    'Pin distinto para una dirección existente o conflicto de escritura concurrente.',
  )
  @ApiUnsupportedMediaTypeResponse({
    description: 'Se requiere application/json.',
  })
  create(@Body() dto: CreateTrayectoDto) {
    return this.trayectos.create(dto);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Actualizar un trayecto y su línea confirmada',
    description:
      'Enviá el trayecto completo con sus puntos, geometría y cobertura de todos los tramos.',
  })
  @ApiConsumes('application/json')
  @ApiOkResponse({ type: TrayectoResponseDto })
  @ApiBadRequestResponse({
    description:
      'Identificador o datos inválidos, localidad inexistente o referencia inexistente.',
  })
  @ApiNotFoundResponse({ description: 'Trayecto no encontrado.' })
  @ApiConflictoPin(
    'Pin distinto para una dirección existente o conflicto de escritura concurrente.',
  )
  @ApiUnsupportedMediaTypeResponse({
    description: 'Se requiere application/json.',
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateTrayectoDto,
  ) {
    return this.trayectos.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Eliminar un trayecto y sus puntos',
    description:
      'Conserva las direcciones de referencia. Requiere Content-Type: application/json aunque no tenga cuerpo.',
  })
  @ApiConsumes('application/json')
  @ApiNoContentResponse({ description: 'Trayecto eliminado.' })
  @ApiBadRequestResponse({ description: 'Identificador inválido.' })
  @ApiNotFoundResponse({ description: 'Trayecto no encontrado.' })
  @ApiUnsupportedMediaTypeResponse({
    description: 'Se requiere application/json.',
  })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.trayectos.remove(id);
  }
}
