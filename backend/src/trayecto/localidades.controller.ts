import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthEndpointGuard } from '../auth/auth-endpoint.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { Role } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';

class LocalidadDto {
  @ApiProperty({ example: '06826050', description: 'Identificador de GeoRef.' })
  id!: string;

  @ApiProperty({ example: 'Trenque Lauquen' })
  nombre!: string;
}

@ApiTags('localidades')
@ApiCookieAuth('session')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Sesión ausente o inválida.' })
@ApiForbiddenResponse({ description: 'Se requiere el rol ADMIN.' })
@Roles([Role.ADMIN])
@UseGuards(AuthEndpointGuard, AuthGuard('jwt'), RolesGuard)
@Controller('api/localidades')
export class LocalidadesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({
    summary: 'Listar las localidades disponibles para trayectos',
  })
  @ApiOkResponse({ type: [LocalidadDto] })
  findAll() {
    return this.prisma.localidad.findMany({ orderBy: { nombre: 'asc' } });
  }
}
