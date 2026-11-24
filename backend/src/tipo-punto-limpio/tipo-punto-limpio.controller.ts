import { Admin } from '../auth/admin.decorator';
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
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiConsumes,
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
import { CreateTipoPuntoLimpioDto } from './dto/create-tipo-punto-limpio.dto';
import { TipoPuntoLimpioResponseDto } from './dto/tipo-punto-limpio-response.dto';
import { UpdateTipoPuntoLimpioDto } from './dto/update-tipo-punto-limpio.dto';
import { TipoPuntoLimpioService } from './tipo-punto-limpio.service';

@ApiTags('tipos-punto-limpio')
@Controller(['tipos-punto-limpio', 'api/tipos-punto-limpio'])
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
  @Admin()
  @ApiConsumes('application/json')
  @ApiUnsupportedMediaTypeResponse({
    description: 'Se requiere application/json.',
  })
  @ApiOperation({
    summary: 'Crear un tipo de punto limpio con sus residuos (ADMIN)',
  })
  @ApiCreatedResponse({ type: TipoPuntoLimpioResponseDto })
  @ApiBadRequestResponse({ description: 'Datos inválidos.' })
  @ApiUnauthorizedResponse({ description: 'Sesión ausente o inválida.' })
  @ApiForbiddenResponse({
    description: 'No tenés permiso para esta operación.',
  })
  @ApiConflictResponse({
    description: 'El nombre ya existe o algún residuo indicado no existe.',
  })
  create(@Body() dto: CreateTipoPuntoLimpioDto) {
    return this.tipos.create(dto);
  }

  @Patch(':id')
  @Admin()
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
    description: 'Datos o identificador inválidos.',
  })
  @ApiUnauthorizedResponse({ description: 'Sesión ausente o inválida.' })
  @ApiForbiddenResponse({
    description: 'No tenés permiso para esta operación.',
  })
  @ApiNotFoundResponse({ description: 'Tipo de punto limpio no encontrado.' })
  @ApiConflictResponse({
    description: 'El nombre ya existe o algún residuo indicado no existe.',
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTipoPuntoLimpioDto,
  ) {
    return this.tipos.update(id, dto);
  }

  @Delete(':id')
  @Admin()
  @HttpCode(204)
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
