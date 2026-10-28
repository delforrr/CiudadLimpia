import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseEnumPipe,
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
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UserAccessGuard } from './user-access.guard';
import { AuthEndpointGuard } from '../auth/auth-endpoint.guard';
import { UserResponseDto } from '../auth/dto/user-response.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserService } from './user.service';
import { Role } from '../generated/prisma/enums';

@ApiTags('users')
@ApiCookieAuth('session')
@ApiBearerAuth()
@ApiUnauthorizedResponse({
  description: 'Sesión ausente, inválida o usuario eliminado.',
})
@ApiForbiddenResponse({ description: 'No tenés permiso para esta operación.' })
@Controller('users')
@UseGuards(AuthEndpointGuard, AuthGuard('jwt'), RolesGuard)
export class UserController {
  constructor(private readonly users: UserService) {}

  @Post()
  @Roles([Role.ADMIN])
  @ApiConsumes('application/json')
  @ApiUnsupportedMediaTypeResponse({
    description: 'Se requiere application/json.',
  })
  @ApiOperation({
    summary: 'Crear una cuenta con cliente y al menos un domicilio (ADMIN)',
  })
  @ApiQuery({ name: 'role', enum: Role, enumName: 'Role', required: true })
  @ApiCreatedResponse({ type: UserResponseDto })
  @ApiBadRequestResponse({ description: 'Datos inválidos.' })
  @ApiConflictResponse({ description: 'El email ya está registrado.' })
  create(
    @Body() dto: CreateUserDto,
    @Query('role', new ParseEnumPipe(Role)) role: Role,
  ) {
    return this.users.create(dto, role);
  }

  @Get()
  @Roles([Role.ADMIN])
  @ApiOperation({ summary: 'Listar usuarios (ADMIN)' })
  @ApiOkResponse({ type: UserResponseDto, isArray: true })
  findAll() {
    return this.users.findAll();
  }

  @Get(':id')
  @UseGuards(UserAccessGuard)
  @ApiOperation({ summary: 'Consultar una cuenta (titular o ADMIN)' })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiBadRequestResponse({ description: 'Identificador inválido.' })
  @ApiNotFoundResponse({ description: 'Usuario no encontrado.' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.users.findOne(id);
  }

  @Patch(':id')
  @UseGuards(UserAccessGuard)
  @ApiConsumes('application/json')
  @ApiUnsupportedMediaTypeResponse({
    description: 'Se requiere application/json.',
  })
  @ApiOperation({
    summary: 'Editar cuenta y cliente (titular o ADMIN)',
    description:
      'Solo ADMIN puede enviar role; USER recibe 403 incluso si el valor es inválido. Si se envía cliente, requiere name y lastName. Omitir domicilios conserva la lista de un cliente existente; enviarlo requiere entre 1 y 20 direcciones y reemplaza la lista completa, con nuevos identificadores. Las cuentas antiguas sin domicilios deben completarlos para poder guardar cualquier actualización (400).',
  })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiBadRequestResponse({ description: 'Datos o identificador inválidos.' })
  @ApiNotFoundResponse({ description: 'Usuario no encontrado.' })
  @ApiConflictResponse({ description: 'El email ya está registrado.' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateUserDto) {
    return this.users.update(id, dto);
  }

  @Delete(':id')
  @Roles([Role.ADMIN])
  @HttpCode(204)
  @ApiConsumes('application/json')
  @ApiUnsupportedMediaTypeResponse({
    description: 'Se requiere application/json.',
  })
  @ApiOperation({
    summary: 'Eliminar cuenta, cliente y domicilios (ADMIN)',
    description:
      'Requiere Content-Type: application/json aunque no tenga cuerpo.',
  })
  @ApiNoContentResponse()
  @ApiBadRequestResponse({ description: 'Identificador inválido.' })
  @ApiNotFoundResponse({ description: 'Usuario no encontrado.' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.users.remove(id);
  }
}
