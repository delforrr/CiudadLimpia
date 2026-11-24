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
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Admin } from '../auth/admin.decorator';
import { CreateZonaDto, UpdateZonaDto, ZonaResponseDto } from './zona.dto';
import { ZonasService } from './zonas.service';

@ApiTags('zonas')
@ApiUnauthorizedResponse({ description: 'Sesión ausente o inválida.' })
@ApiForbiddenResponse({ description: 'Se requiere el rol ADMIN.' })
@Admin()
@Controller('api/zonas')
export class ZonasController {
  constructor(private readonly zonas: ZonasService) {}

  @Get()
  @ApiOkResponse({ type: [ZonaResponseDto] })
  listar() {
    return this.zonas.listar();
  }

  @Post()
  @ApiCreatedResponse({ type: ZonaResponseDto })
  @ApiConflictResponse({
    description: 'Ya existe una zona con ese nombre en la localidad.',
  })
  crear(@Body() dto: CreateZonaDto) {
    return this.zonas.crear(dto);
  }

  @Patch(':id')
  @ApiOkResponse({ type: ZonaResponseDto })
  @ApiNotFoundResponse({ description: 'Zona no encontrada.' })
  @ApiConflictResponse({
    description: 'Ya existe una zona con ese nombre en la localidad.',
  })
  editar(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateZonaDto) {
    return this.zonas.editar(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ description: 'Zona no encontrada.' })
  @ApiConflictResponse({ description: 'La zona tiene trayectos asignados.' })
  eliminar(@Param('id', ParseUUIDPipe) id: string) {
    return this.zonas.eliminar(id);
  }
}
