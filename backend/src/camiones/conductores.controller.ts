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
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnsupportedMediaTypeResponse,
} from '@nestjs/swagger';
import { AuthEndpointGuard } from '../auth/auth-endpoint.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { Role } from '../generated/prisma/enums';
import { ConductoresService } from './conductores.service';
import {
  ConductorResponseDto,
  CreateConductorDto,
  UpdateConductorDto,
} from './dto/conductor.dto';

@ApiTags('conductores')
@ApiCookieAuth('session')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Sesión ausente o inválida.' })
@ApiForbiddenResponse({ description: 'Se requiere el rol ADMIN.' })
@ApiBadRequestResponse({ description: 'Identificador o datos inválidos.' })
@Roles([Role.ADMIN])
@UseGuards(AuthEndpointGuard, AuthGuard('jwt'), RolesGuard)
@Controller('api/conductores')
export class ConductoresController {
  constructor(private readonly conductores: ConductoresService) {}

  @Get()
  @ApiOkResponse({ type: [ConductorResponseDto] })
  findAll() {
    return this.conductores.findAll();
  }

  @Get(':id')
  @ApiOkResponse({ type: ConductorResponseDto })
  @ApiNotFoundResponse({ description: 'Conductor no encontrado.' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.conductores.findOne(id);
  }

  @Post()
  @ApiConsumes('application/json')
  @ApiUnsupportedMediaTypeResponse({
    description: 'Se requiere application/json.',
  })
  @ApiCreatedResponse({ type: ConductorResponseDto })
  create(@Body() dto: CreateConductorDto) {
    return this.conductores.create(dto);
  }

  @Patch(':id')
  @ApiConsumes('application/json')
  @ApiUnsupportedMediaTypeResponse({
    description: 'Se requiere application/json.',
  })
  @ApiOkResponse({ type: ConductorResponseDto })
  @ApiNotFoundResponse({ description: 'Conductor no encontrado.' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateConductorDto,
  ) {
    return this.conductores.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiConsumes('application/json')
  @ApiUnsupportedMediaTypeResponse({
    description: 'Se requiere application/json.',
  })
  @ApiNoContentResponse({ description: 'Conductor marcado como inactivo.' })
  @ApiNotFoundResponse({ description: 'Conductor no encontrado.' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.conductores.delete(id);
  }
}
