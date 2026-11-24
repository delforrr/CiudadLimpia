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
  Req,
  UseGuards,
} from '@nestjs/common';
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
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnsupportedMediaTypeResponse,
} from '@nestjs/swagger';
import type { AuthRequest } from '../auth/auth.guard';
import { z } from 'zod';
import { ApiConflictoPin } from '../direccion/dto/direccion-response.dto';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UserAccessGuard } from './user-access.guard';
import { AuthEndpointGuard } from '../auth/auth-endpoint.guard';
import { publicUserSchema } from '../accounts/account.schemas';
import {
  createUserSchema,
  updateUserSchema,
  type CreateUserInput,
  type UpdateUserInput,
} from './user.schemas';
import { UserService } from './user.service';
import { Role } from '../generated/prisma/enums';

const domicilioActualSchema = z.strictObject({ direccionId: z.uuid() });

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
  @ApiCreatedResponse({ standardSchema: publicUserSchema })
  @ApiBadRequestResponse({ description: 'Datos inválidos.' })
  @ApiConflictoPin(
    'Email ya registrado o pin distinto para una dirección existente.',
  )
  create(@Body({ schema: createUserSchema }) dto: CreateUserInput) {
    const { role, ...account } = dto;
    return this.users.create(account, role);
  }

  @Get()
  @Roles([Role.ADMIN])
  @ApiOperation({ summary: 'Listar usuarios (ADMIN)' })
  @ApiOkResponse({ standardSchema: publicUserSchema.array() })
  findAll() {
    return this.users.findAll();
  }

  @Patch('me/domicilio-actual')
  @HttpCode(204)
  @ApiConsumes('application/json')
  @ApiOperation({ summary: 'Elegir un domicilio propio para la pantalla Hoy' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ description: 'Domicilio propio no encontrado.' })
  @ApiBadRequestResponse({ description: 'Identificador inválido.' })
  elegirDomicilio(
    @Req() request: AuthRequest,
    @Body({ schema: domicilioActualSchema })
    { direccionId }: z.infer<typeof domicilioActualSchema>,
  ) {
    return this.users.elegirDomicilio(request.user.id, direccionId);
  }

  @Get(':id')
  @UseGuards(UserAccessGuard)
  @ApiOperation({ summary: 'Consultar una cuenta (titular o ADMIN)' })
  @ApiOkResponse({ standardSchema: publicUserSchema })
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
      'Solo ADMIN puede enviar role; USER recibe 403 incluso si el valor es inválido. Si se envía cliente, requiere name y lastName. Omitir domicilios conserva la lista de un cliente existente; enviarla admite hasta 20 direcciones y reemplaza la lista completa, con los IDs de las direcciones compartidas. Una lista vacía quita todos los vínculos.',
  })
  @ApiOkResponse({ standardSchema: publicUserSchema })
  @ApiBadRequestResponse({ description: 'Datos o identificador inválidos.' })
  @ApiNotFoundResponse({ description: 'Usuario no encontrado.' })
  @ApiConflictoPin(
    'Email ya registrado o pin distinto para una dirección existente.',
  )
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body({ schema: updateUserSchema }) dto: UpdateUserInput,
  ) {
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
    summary: 'Eliminar cuenta, cliente y sus vínculos de domicilio (ADMIN)',
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
