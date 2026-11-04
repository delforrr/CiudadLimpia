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
  ApiBearerAuth,
  ApiConflictResponse,
  ApiConsumes,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthEndpointGuard } from '../auth/auth-endpoint.guard';
import { AuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { Role } from '../generated/prisma/enums';
import { DireccionesService } from './direcciones.service';
import {
  CreateDireccionDto,
  DireccionResponseDto,
  UpdateDireccionDto,
} from './dto/direccion.dto';

@ApiTags('direcciones')
@ApiCookieAuth('session')
@ApiBearerAuth()
@ApiUnauthorizedResponse()
@ApiForbiddenResponse()
@Roles([Role.ADMIN])
@UseGuards(AuthEndpointGuard, AuthGuard, RolesGuard)
@Controller('direcciones')
export class DireccionesController {
  constructor(private readonly direcciones: DireccionesService) {}

  @Get()
  @ApiQuery({
    name: 'buscar',
    required: false,
    type: String,
    description: 'Busqueda por texto. Hasta 20 resultados.',
  })
  @ApiOkResponse({ type: DireccionResponseDto, isArray: true })
  findAll(@Query('buscar') buscar?: string) {
    return this.direcciones.findAll(
      typeof buscar === 'string' ? buscar.trim() : undefined,
    );
  }

  @Get(':id')
  @ApiOkResponse({ type: DireccionResponseDto })
  @ApiNotFoundResponse()
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.direcciones.findOne(id);
  }

  @Post()
  @ApiConsumes('application/json')
  @ApiCreatedResponse({ type: DireccionResponseDto })
  @ApiConflictResponse({ description: 'La direccion ya existe.' })
  create(@Body() dto: CreateDireccionDto) {
    return this.direcciones.create(dto);
  }

  @Patch(':id')
  @ApiConsumes('application/json')
  @ApiOkResponse({ type: DireccionResponseDto })
  @ApiNotFoundResponse()
  @ApiConflictResponse({ description: 'La direccion ya existe.' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDireccionDto,
  ) {
    return this.direcciones.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiConsumes('application/json')
  @ApiNoContentResponse()
  @ApiNotFoundResponse()
  @ApiConflictResponse({ description: 'La direccion esta en uso.' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.direcciones.remove(id);
  }
}
