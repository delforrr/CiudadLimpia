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
  Query,
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
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnsupportedMediaTypeResponse,
} from '@nestjs/swagger';
import { AuthEndpointGuard } from '../auth/auth-endpoint.guard';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { Role } from '../generated/prisma/enums';
import { DireccionesService } from './direcciones.service';
import { CreateDireccionDto } from './dto/create-direccion.dto';
import { DireccionResponseDto } from './dto/direccion-response.dto';
import { UpdateDireccionDto } from './dto/update-direccion.dto';

@ApiTags('direcciones')
@ApiCookieAuth('session')
@ApiBearerAuth()
@ApiUnauthorizedResponse()
@ApiForbiddenResponse()
@Roles([Role.ADMIN])
@UseGuards(AuthEndpointGuard, AuthGuard('jwt'), RolesGuard)
@Controller('direcciones')
export class DireccionesController {
  constructor(private readonly direcciones: DireccionesService) {}

  @Get()
  @ApiOperation({
    summary: 'Listar direcciones del catálogo compartido (ADMIN)',
  })
  @ApiQuery({
    name: 'buscar',
    required: false,
    type: String,
    description: 'Búsqueda por texto. Hasta 20 resultados.',
  })
  @ApiOkResponse({ type: DireccionResponseDto, isArray: true })
  findAll(@Query('buscar') buscar?: string) {
    return this.direcciones.findAll(buscar);
  }

  @Get('puntos-limpios')
  @ApiOperation({
    summary: 'Listar direcciones disponibles para puntos limpios (ADMIN)',
  })
  @ApiQuery({
    name: 'buscar',
    required: false,
    type: String,
    description: 'Búsqueda por texto. Hasta 20 resultados.',
  })
  @ApiOkResponse({ type: DireccionResponseDto, isArray: true })
  findForPuntosLimpios(@Query('buscar') buscar?: string) {
    return this.direcciones.findAll(buscar);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consultar una dirección por ID (ADMIN)' })
  @ApiBadRequestResponse({ description: 'Identificador inválido.' })
  @ApiOkResponse({ type: DireccionResponseDto })
  @ApiNotFoundResponse()
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.direcciones.findOne(id);
  }

  @Post()
  @ApiOperation({
    summary: 'Registrar una dirección en el catálogo compartido (ADMIN)',
    description:
      'Enviá calle, altura, lat y long. El par identifica el pin compartido.',
  })
  @ApiConsumes('application/json')
  @ApiCreatedResponse({ type: DireccionResponseDto })
  @ApiBadRequestResponse({
    description: 'Datos inválidos o par de coordenadas incompleto.',
  })
  @ApiConflictResponse({ description: 'La dirección ya existe.' })
  @ApiUnsupportedMediaTypeResponse()
  create(@Body() dto: CreateDireccionDto) {
    return this.direcciones.create(dto);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Editar una dirección del catálogo compartido (ADMIN)',
    description:
      'Enviá lat y long juntas para corregir el pin compartido. Si enviás calle o altura, deben coincidir con el frente registrado.',
  })
  @ApiConsumes('application/json')
  @ApiOkResponse({ type: DireccionResponseDto })
  @ApiBadRequestResponse({
    description:
      'Identificador o datos inválidos, o par de coordenadas incompleto.',
  })
  @ApiNotFoundResponse()
  @ApiUnsupportedMediaTypeResponse()
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDireccionDto,
  ) {
    return this.direcciones.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Eliminar una dirección del catálogo compartido (ADMIN)',
  })
  @HttpCode(204)
  @ApiConsumes('application/json')
  @ApiNoContentResponse()
  @ApiBadRequestResponse({ description: 'Identificador inválido.' })
  @ApiNotFoundResponse()
  @ApiConflictResponse({ description: 'La dirección está en uso.' })
  @ApiUnsupportedMediaTypeResponse()
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.direcciones.remove(id);
  }
}
