import {
  Body,
  Controller,
  Get,
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
  ApiConflictResponse,
  ApiConsumes,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnsupportedMediaTypeResponse,
} from '@nestjs/swagger';
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
      'Datos inválidos, localidad inexistente o referencia inexistente o privada.',
  })
  @ApiConflictResponse({
    description: 'Conflicto con una escritura concurrente. Podés reintentar.',
  })
  @ApiUnsupportedMediaTypeResponse({
    description: 'Se requiere application/json.',
  })
  create(@Body() dto: CreateTrayectoDto) {
    return this.trayectos.create(dto);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Actualizar un trayecto y su línea confirmada',
    description: 'Enviá el trayecto completo con sus puntos y geometría.',
  })
  @ApiConsumes('application/json')
  @ApiOkResponse({ type: TrayectoResponseDto })
  @ApiBadRequestResponse({
    description:
      'Identificador o datos inválidos, localidad inexistente o referencia inexistente o privada.',
  })
  @ApiNotFoundResponse({ description: 'Trayecto no encontrado.' })
  @ApiConflictResponse({
    description: 'Conflicto con una escritura concurrente. Podés reintentar.',
  })
  @ApiUnsupportedMediaTypeResponse({
    description: 'Se requiere application/json.',
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateTrayectoDto,
  ) {
    return this.trayectos.update(id, dto);
  }
}
