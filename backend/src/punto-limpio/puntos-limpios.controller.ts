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
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { Role } from '../generated/prisma/enums';
import { CreatePuntoLimpioDto } from './dto/create-punto-limpio.dto';
import { PuntoLimpioResponseDto } from './dto/punto-limpio-response.dto';
import { UpdatePuntoLimpioDto } from './dto/update-punto-limpio.dto';
import { PuntosLimpiosService } from './puntos-limpios.service';

@ApiTags('puntos-limpios')
@Controller('puntos-limpios')
export class PuntosLimpiosController {
  constructor(private readonly puntos: PuntosLimpiosService) {}

  @Get()
  @ApiOperation({ summary: 'Listar los puntos limpios' })
  @ApiOkResponse({ type: PuntoLimpioResponseDto, isArray: true })
  findAll() {
    return this.puntos.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consultar un punto limpio' })
  @ApiOkResponse({ type: PuntoLimpioResponseDto })
  @ApiBadRequestResponse({ description: 'Identificador inválido.' })
  @ApiNotFoundResponse({ description: 'Punto limpio no encontrado.' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.puntos.findOne(id);
  }

  @Post()
  @Roles([Role.ADMIN])
  @UseGuards(AuthEndpointGuard, AuthGuard('jwt'), RolesGuard)
  @ApiCookieAuth('session')
  @ApiBearerAuth()
  @ApiConsumes('application/json')
  @ApiUnsupportedMediaTypeResponse({
    description: 'Se requiere application/json.',
  })
  @ApiOperation({
    summary: 'Crear un punto limpio (ADMIN)',
    description:
      'Enviá direccionId o direccion con calle y altura y el par lat y long a nivel del punto. Si enviás coordenadas junto al ID, deben coincidir con el pin guardado.',
  })
  @ApiCreatedResponse({ type: PuntoLimpioResponseDto })
  @ApiBadRequestResponse({
    description: 'Datos inválidos o dirección inexistente.',
  })
  @ApiUnauthorizedResponse({ description: 'Sesión ausente o inválida.' })
  @ApiForbiddenResponse({
    description: 'No tenés permiso para esta operación.',
  })
  @ApiConflictoPin(
    'Pin distinto para una dirección existente o conflicto de referencia.',
  )
  create(@Body() dto: CreatePuntoLimpioDto) {
    return this.puntos.create(dto);
  }

  @Patch(':id')
  @Roles([Role.ADMIN])
  @UseGuards(AuthEndpointGuard, AuthGuard('jwt'), RolesGuard)
  @ApiCookieAuth('session')
  @ApiBearerAuth()
  @ApiConsumes('application/json')
  @ApiUnsupportedMediaTypeResponse({
    description: 'Se requiere application/json.',
  })
  @ApiOperation({
    summary: 'Editar un punto limpio (ADMIN)',
    description:
      'Enviá direccionId para cambiar el frente. El par opcional lat y long debe coincidir con el pin de la dirección resultante.',
  })
  @ApiOkResponse({ type: PuntoLimpioResponseDto })
  @ApiBadRequestResponse({
    description: 'Datos o identificador inválidos, o dirección inexistente.',
  })
  @ApiUnauthorizedResponse({ description: 'Sesión ausente o inválida.' })
  @ApiForbiddenResponse({
    description: 'No tenés permiso para esta operación.',
  })
  @ApiNotFoundResponse({ description: 'Punto limpio no encontrado.' })
  @ApiConflictoPin(
    'Pin distinto para una dirección existente o conflicto de referencia.',
  )
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePuntoLimpioDto,
  ) {
    return this.puntos.update(id, dto);
  }

  @Delete(':id')
  @Roles([Role.ADMIN])
  @UseGuards(AuthEndpointGuard, AuthGuard('jwt'), RolesGuard)
  @HttpCode(204)
  @ApiCookieAuth('session')
  @ApiBearerAuth()
  @ApiConsumes('application/json')
  @ApiUnsupportedMediaTypeResponse({
    description: 'Se requiere application/json.',
  })
  @ApiOperation({
    summary: 'Eliminar un punto limpio (ADMIN)',
    description:
      'Requiere Content-Type: application/json aunque no tenga cuerpo.',
  })
  @ApiNoContentResponse()
  @ApiBadRequestResponse({ description: 'Identificador inválido.' })
  @ApiUnauthorizedResponse({ description: 'Sesión ausente o inválida.' })
  @ApiForbiddenResponse({
    description: 'No tenés permiso para esta operación.',
  })
  @ApiNotFoundResponse({ description: 'Punto limpio no encontrado.' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.puntos.remove(id);
  }
}
