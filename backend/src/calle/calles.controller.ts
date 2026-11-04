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
import { AuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { Role } from '../generated/prisma/enums';
import { CalleDto, CalleResponseDto } from './calle.dto';
import { CallesService } from './calles.service';

@ApiTags('calles')
@ApiCookieAuth('session')
@ApiBearerAuth()
@ApiUnauthorizedResponse()
@ApiForbiddenResponse()
@Roles([Role.ADMIN])
@UseGuards(AuthEndpointGuard, AuthGuard, RolesGuard)
@Controller('calles')
export class CallesController {
  constructor(private readonly calles: CallesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar calles del catálogo (ADMIN)' })
  @ApiQuery({
    name: 'buscar',
    required: false,
    type: String,
    description: 'Búsqueda por nombre. Hasta 20 resultados.',
  })
  @ApiOkResponse({ type: CalleResponseDto, isArray: true })
  findAll(@Query('buscar') buscar?: string) {
    return this.calles.findAll(buscar);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consultar una calle por ID (ADMIN)' })
  @ApiOkResponse({ type: CalleResponseDto })
  @ApiBadRequestResponse()
  @ApiNotFoundResponse()
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.calles.findOne(id);
  }

  @Post()
  @ApiOperation({
    summary: 'Registrar una calle (ADMIN)',
    description:
      'El nombre debe ser único sin distinguir mayúsculas y minúsculas.',
  })
  @ApiConsumes('application/json')
  @ApiCreatedResponse({ type: CalleResponseDto })
  @ApiBadRequestResponse()
  @ApiConflictResponse({ description: 'La calle ya existe.' })
  @ApiUnsupportedMediaTypeResponse()
  create(@Body() dto: CalleDto) {
    return this.calles.create(dto.calle);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Renombrar una calle (ADMIN)',
    description: 'Las direcciones vinculadas se muestran con el nuevo nombre.',
  })
  @ApiConsumes('application/json')
  @ApiOkResponse({ type: CalleResponseDto })
  @ApiBadRequestResponse()
  @ApiNotFoundResponse()
  @ApiConflictResponse({ description: 'La calle ya existe.' })
  @ApiUnsupportedMediaTypeResponse()
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CalleDto) {
    return this.calles.update(id, dto.calle);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Eliminar una calle sin direcciones vinculadas (ADMIN)',
  })
  @HttpCode(204)
  @ApiConsumes('application/json')
  @ApiNoContentResponse()
  @ApiBadRequestResponse()
  @ApiNotFoundResponse()
  @ApiConflictResponse({ description: 'La calle está en uso.' })
  @ApiUnsupportedMediaTypeResponse()
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.calles.remove(id);
  }
}
