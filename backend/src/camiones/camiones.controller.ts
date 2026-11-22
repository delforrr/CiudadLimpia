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
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ContratosConductorService } from '../contrato-conductor/contratos-conductor.service';
import { ContratoVigenteResponseDto } from '../contrato-conductor/dto/contrato-conductor.dto';
import { Role } from '../generated/prisma/enums';
import { CamionesService } from './camiones.service';
import { CamionResponseDto } from './dto/camion-response.dto';
import { CreateCamionDto } from './dto/create-camion.dto';
import { UpdateCamionDto } from './dto/update-camion.dto';

@ApiTags('camiones')
@ApiCookieAuth('session')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Sesión ausente o inválida.' })
@ApiForbiddenResponse({ description: 'Se requiere el rol ADMIN.' })
@ApiBadRequestResponse({ description: 'Identificador o datos inválidos.' })
@Roles([Role.ADMIN])
@UseGuards(AuthEndpointGuard, AuthGuard('jwt'), RolesGuard)
@Controller('api/camiones')
export class CamionesController {
  constructor(
    private readonly camiones: CamionesService,
    private readonly contratos: ContratosConductorService,
  ) {}

  @Get()
  @ApiOkResponse({ type: [CamionResponseDto] })
  findAll() {
    return this.camiones.findAll();
  }

  @Get(':id')
  @ApiOkResponse({ type: CamionResponseDto })
  @ApiNotFoundResponse({ description: 'Camión no encontrado.' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.camiones.findOne(id);
  }

  @Get(':id/contrato-vigente')
  @ApiOperation({ summary: 'Consultar el contrato vigente del camión' })
  @ApiOkResponse({
    description: 'El campo contrato es null si el camión no tiene uno vigente.',
    type: ContratoVigenteResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Camión no encontrado.' })
  async findContratoVigente(@Param('id', ParseUUIDPipe) id: string) {
    return { contrato: await this.contratos.findContratoVigente(id) };
  }

  @Post()
  @ApiConsumes('application/json')
  @ApiUnsupportedMediaTypeResponse({
    description: 'Se requiere application/json.',
  })
  @ApiCreatedResponse({ type: CamionResponseDto })
  @ApiConflictResponse({ description: 'La patente ya existe.' })
  create(@Body() dto: CreateCamionDto) {
    return this.camiones.create(dto);
  }

  @Patch(':id')
  @ApiConsumes('application/json')
  @ApiUnsupportedMediaTypeResponse({
    description: 'Se requiere application/json.',
  })
  @ApiOkResponse({ type: CamionResponseDto })
  @ApiNotFoundResponse({ description: 'Camión no encontrado.' })
  @ApiConflictResponse({ description: 'La patente ya existe.' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCamionDto) {
    return this.camiones.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiConsumes('application/json')
  @ApiUnsupportedMediaTypeResponse({
    description: 'Se requiere application/json.',
  })
  @ApiNoContentResponse({ description: 'Camión marcado como inactivo.' })
  @ApiNotFoundResponse({ description: 'Camión no encontrado.' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.camiones.delete(id);
  }
}
