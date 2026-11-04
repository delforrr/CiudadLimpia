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
import { AuthEndpointGuard } from '../auth/auth-endpoint.guard';
import { AuthGuard } from '../auth/auth.guard';
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
  @UseGuards(AuthEndpointGuard, AuthGuard, RolesGuard)
  @ApiCookieAuth('session')
  @ApiBearerAuth()
  @ApiConsumes('application/json')
  @ApiUnsupportedMediaTypeResponse({
    description: 'Se requiere application/json.',
  })
  @ApiOperation({
    summary: 'Crear un punto limpio (ADMIN)',
  })
  @ApiCreatedResponse({ type: PuntoLimpioResponseDto })
  @ApiBadRequestResponse({
    description: 'Datos inválidos o tipo o dirección inexistentes.',
  })
  @ApiUnauthorizedResponse({ description: 'Sesión ausente o inválida.' })
  @ApiForbiddenResponse({
    description: 'No tenés permiso para esta operación.',
  })
  create(@Body() dto: CreatePuntoLimpioDto) {
    return this.puntos.create(dto);
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
    summary: 'Editar un punto limpio (ADMIN)',
  })
  @ApiOkResponse({ type: PuntoLimpioResponseDto })
  @ApiBadRequestResponse({
    description:
      'Datos o identificador inválidos, o tipo o dirección inexistentes.',
  })
  @ApiUnauthorizedResponse({ description: 'Sesión ausente o inválida.' })
  @ApiForbiddenResponse({
    description: 'No tenés permiso para esta operación.',
  })
  @ApiNotFoundResponse({ description: 'Punto limpio no encontrado.' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePuntoLimpioDto,
  ) {
    return this.puntos.update(id, dto);
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
