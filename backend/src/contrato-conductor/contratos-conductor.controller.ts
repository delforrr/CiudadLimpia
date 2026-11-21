import {
  Body,
  Controller,
  Get,
  Param,
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
import { Role } from '../generated/prisma/enums';
import { ContratosConductorService } from './contratos-conductor.service';
import {
  ContratoConductorIdDto,
  ContratoConductorResponseDto,
  CreateContratoConductorDto,
  UpdateContratoConductorDto,
} from './dto/contrato-conductor.dto';

@ApiTags('contratos-conductor')
@ApiCookieAuth('session')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Sesión ausente o inválida.' })
@ApiForbiddenResponse({ description: 'Se requiere el rol ADMIN.' })
@ApiBadRequestResponse({ description: 'Identificadores o fechas inválidas.' })
@Roles([Role.ADMIN])
@UseGuards(AuthEndpointGuard, AuthGuard('jwt'), RolesGuard)
@Controller('api/contratos-conductor')
export class ContratosConductorController {
  constructor(private readonly contratos: ContratosConductorService) {}

  @Get()
  @ApiOkResponse({ type: [ContratoConductorResponseDto] })
  findAll() {
    return this.contratos.findAll();
  }

  @Get(':idCamion/:idConductor/:fechaInicio')
  @ApiOkResponse({ type: ContratoConductorResponseDto })
  @ApiNotFoundResponse({ description: 'Contrato no encontrado.' })
  findOne(@Param() id: ContratoConductorIdDto) {
    return this.contratos.findOne(id);
  }

  @Post()
  @ApiOperation({
    summary: 'Registrar un contrato de conductor y camión',
    description:
      'Las fechas requieren zona horaria. El inicio se incluye y el fin se excluye.',
  })
  @ApiConsumes('application/json')
  @ApiUnsupportedMediaTypeResponse({
    description: 'Se requiere application/json.',
  })
  @ApiCreatedResponse({ type: ContratoConductorResponseDto })
  @ApiNotFoundResponse({ description: 'Camión o conductor no encontrado.' })
  @ApiConflictResponse({
    description:
      'Hay superposición, escritura concurrente o una parte inactiva.',
  })
  create(@Body() dto: CreateContratoConductorDto) {
    return this.contratos.create(dto);
  }

  @Patch(':idCamion/:idConductor/:fechaInicio')
  @ApiOperation({
    summary: 'Actualizar la fecha de fin del contrato',
    description: 'Enviar fechaFin con null deja el contrato sin fecha de fin.',
  })
  @ApiConsumes('application/json')
  @ApiUnsupportedMediaTypeResponse({
    description: 'Se requiere application/json.',
  })
  @ApiOkResponse({ type: ContratoConductorResponseDto })
  @ApiNotFoundResponse({ description: 'Contrato no encontrado.' })
  @ApiConflictResponse({
    description: 'Hay superposición o escritura concurrente.',
  })
  update(
    @Param() id: ContratoConductorIdDto,
    @Body() dto: UpdateContratoConductorDto,
  ) {
    return this.contratos.update(id, dto);
  }
}
