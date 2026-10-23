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
  Req,
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
import { AuthGuard, type AuthRequest } from '../auth/auth.guard';
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
@UseGuards(AuthEndpointGuard, AuthGuard)
export class UserController {
  constructor(private readonly users: UserService) {}

  @Post()
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
    @Req() request: AuthRequest,
    @Body() dto: CreateUserDto,
    @Query('role', new ParseEnumPipe(Role)) role: Role,
  ) {
    return this.users.create(request.userId, dto, role);
  }

  @Get()
  @ApiOperation({ summary: 'Listar usuarios (ADMIN)' })
  @ApiOkResponse({ type: UserResponseDto, isArray: true })
  findAll(@Req() request: AuthRequest) {
    return this.users.findAll(request.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consultar una cuenta (titular o ADMIN)' })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiBadRequestResponse({ description: 'Identificador inválido.' })
  @ApiNotFoundResponse({ description: 'Usuario no encontrado.' })
  findOne(@Req() request: AuthRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.users.findOne(request.userId, id);
  }

  @Patch(':id')
  @ApiConsumes('application/json')
  @ApiUnsupportedMediaTypeResponse({
    description: 'Se requiere application/json.',
  })
  @ApiOperation({
    summary: 'Editar cuenta y cliente (titular o ADMIN)',
    description:
      'Solo ADMIN puede enviar role. Si se envía cliente, requiere name y lastName. Omitir domicilios conserva la lista de un cliente existente; enviarlo requiere entre 1 y 20 direcciones y reemplaza la lista completa, con nuevos identificadores. Las cuentas antiguas sin domicilios deben completarlos para poder guardar cualquier actualización (400).',
  })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiBadRequestResponse({ description: 'Datos o identificador inválidos.' })
  @ApiNotFoundResponse({ description: 'Usuario no encontrado.' })
  @ApiConflictResponse({ description: 'El email ya está registrado.' })
  update(
    @Req() request: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.users.update(request.userId, id, dto);
  }

  @Delete(':id')
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
  async remove(
    @Req() request: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.users.remove(request.userId, id);
  }
}
