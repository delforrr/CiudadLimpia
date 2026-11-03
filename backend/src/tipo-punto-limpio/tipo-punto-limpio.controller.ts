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
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
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
import { AuthEndpointGuard } from '../auth/auth-endpoint.guard';
import { AuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { Role } from '../generated/prisma/enums';
import { CreateTipoPuntoLimpioDto } from './dto/create-tipo-punto-limpio.dto';
import { TipoPuntoLimpioResponseDto } from './dto/tipo-punto-limpio-response.dto';
import { UpdateTipoPuntoLimpioDto } from './dto/update-tipo-punto-limpio.dto';
import { TipoPuntoLimpioService } from './tipo-punto-limpio.service';

@ApiTags('tipos-punto-limpio')
@Controller('tipos-punto-limpio')
export class TipoPuntoLimpioController {
  constructor(private readonly tipos: TipoPuntoLimpioService) {}

  @Get()
  @ApiOperation({ summary: 'Listar los tipos de punto limpio' })
  @ApiOkResponse({ type: TipoPuntoLimpioResponseDto, isArray: true })
  findAll() {
    return this.tipos.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consultar un tipo de punto limpio' })
  @ApiOkResponse({ type: TipoPuntoLimpioResponseDto })
  @ApiBadRequestResponse({ description: 'Identificador inválido.' })
  @ApiNotFoundResponse({ description: 'Tipo de punto limpio no encontrado.' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.tipos.findOne(id);
  }

  @Post()
  @Roles([Role.ADMIN])
  @UseGuards(AuthEndpointGuard, AuthGuard, RolesGuard)
  @ApiCookieAuth('session')
  @ApiBearerAuth()
  @ApiConsumes('application/json')
  @ApiUnsupportedMediaTypeResponse({
    description: 'Se requiere application/json.',
  })
  @ApiOperation({
    summary: 'Crear un tipo de punto limpio con sus residuos (ADMIN)',
  })
  @ApiCreatedResponse({ type: TipoPuntoLimpioResponseDto })
  @ApiBadRequestResponse({
    description: 'Datos inválidos o residuos inexistentes.',
  })
  @ApiUnauthorizedResponse({ description: 'Sesión ausente o inválida.' })
  @ApiForbiddenResponse({
    description: 'No tenés permiso para esta operación.',
  })
  @ApiConflictResponse({
    description: 'Ya existe un tipo de punto limpio con ese nombre.',
  })
  create(@Body() dto: CreateTipoPuntoLimpioDto) {
    return this.tipos.create(dto);
  }

  @Patch(':id')
  @Roles([Role.ADMIN])
  @UseGuards(AuthEndpointGuard, AuthGuard, RolesGuard)
  @ApiCookieAuth('session')
  @ApiBearerAuth()
  @ApiConsumes('application/json')
  @ApiUnsupportedMediaTypeResponse({
    description: 'Se requiere application/json.',
  })
  @ApiOperation({
    summary: 'Editar un tipo de punto limpio y sus residuos (ADMIN)',
    description:
      'Si se envía residuos, reemplaza la lista completa. Omitirlo conserva la lista actual.',
  })
  @ApiOkResponse({ type: TipoPuntoLimpioResponseDto })
  @ApiBadRequestResponse({
    description: 'Datos o identificador inválidos, o residuos inexistentes.',
  })
  @ApiUnauthorizedResponse({ description: 'Sesión ausente o inválida.' })
  @ApiForbiddenResponse({
    description: 'No tenés permiso para esta operación.',
  })
  @ApiNotFoundResponse({ description: 'Tipo de punto limpio no encontrado.' })
  @ApiConflictResponse({
    description: 'Ya existe un tipo de punto limpio con ese nombre.',
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTipoPuntoLimpioDto,
  ) {
    return this.tipos.update(id, dto);
  }

  @Delete(':id')
  @Roles([Role.ADMIN])
  @UseGuards(AuthEndpointGuard, AuthGuard, RolesGuard)
  @HttpCode(204)
  @ApiCookieAuth('session')
  @ApiBearerAuth()
  @ApiConsumes('application/json')
  @ApiUnsupportedMediaTypeResponse({
    description: 'Se requiere application/json.',
  })
  @ApiOperation({
    summary: 'Eliminar un tipo de punto limpio (ADMIN)',
    description:
      'Requiere Content-Type: application/json aunque no tenga cuerpo. Falla si hay puntos limpios que lo usan.',
  })
  @ApiNoContentResponse()
  @ApiBadRequestResponse({ description: 'Identificador inválido.' })
  @ApiUnauthorizedResponse({ description: 'Sesión ausente o inválida.' })
  @ApiForbiddenResponse({
    description: 'No tenés permiso para esta operación.',
  })
  @ApiNotFoundResponse({ description: 'Tipo de punto limpio no encontrado.' })
  @ApiConflictResponse({
    description: 'El tipo de punto limpio está en uso.',
  })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.tipos.remove(id);
  }
}
