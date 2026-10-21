import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { CookieOptions, Response } from 'express';
import { AuthService, sessionSeconds } from './auth.service';
import { AuthGuard, type AuthRequest } from './auth.guard';
import { LoginRequestDto } from './dto/login-request.dto';
import { SigninRequestDto } from './dto/signin-request.dto';
import { AuthEndpointGuard } from './auth-endpoint.guard';
import { UserResponseDto } from './dto/user-response.dto';

const cookieOptions: CookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/',
};

@ApiTags('auth')
@Controller('auth')
@UseGuards(AuthEndpointGuard)
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @ApiOperation({
    summary: 'Crear una cuenta e iniciar sesión',
    description:
      'Crea una cookie session HttpOnly. La sesión dura una hora; rememberMe se ignora en registro.',
  })
  @ApiConsumes('application/json')
  @ApiCreatedResponse({
    type: UserResponseDto,
    description:
      'Cuenta creada. La sesión se entrega en Set-Cookie, no en el JSON.',
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos o contraseñas diferentes.',
  })
  @ApiResponse({ status: 409, description: 'El email ya está registrado.' })
  @ApiResponse({
    status: 403,
    description: 'Solicitud desde otro sitio rechazada.',
  })
  @ApiResponse({
    status: 415,
    description: 'Se requiere Content-Type: application/json.',
  })
  @ApiResponse({
    status: 429,
    description:
      'Más de diez intentos por IP en quince minutos. Retry-After indica los segundos de espera.',
  })
  async register(
    @Body() dto: SigninRequestDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<UserResponseDto> {
    const user = await this.auth.register(dto);
    await this.setSession(response, user.id, false);
    return user;
  }

  @Post('login')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Iniciar sesión con email y contraseña',
    description:
      'Guarda el JWT en la cookie session HttpOnly. Con rememberMe, la sesión persiste durante siete días.',
  })
  @ApiConsumes('application/json')
  @ApiOkResponse({
    type: UserResponseDto,
    description:
      'Sesión iniciada mediante Set-Cookie. El JSON contiene únicamente el usuario.',
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos.' })
  @ApiResponse({ status: 401, description: 'Email o contraseña incorrectos.' })
  @ApiResponse({
    status: 403,
    description: 'Solicitud desde otro sitio rechazada.',
  })
  @ApiResponse({
    status: 415,
    description: 'Se requiere Content-Type: application/json.',
  })
  @ApiResponse({
    status: 429,
    description:
      'Más de diez intentos por IP en quince minutos. Retry-After indica los segundos de espera.',
  })
  async login(
    @Body() dto: LoginRequestDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<UserResponseDto> {
    const user = await this.auth.login(dto);
    await this.setSession(response, user.id, dto.rememberMe ?? false);
    return user;
  }

  @Get('me')
  @ApiCookieAuth('session')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Consultar el usuario de la sesión',
    description:
      'Acepta la cookie session del navegador o un JWT existente mediante Authorization: Bearer. Cualquiera de los dos mecanismos es suficiente.',
  })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiResponse({
    status: 401,
    description: 'Sesión ausente, inválida, vencida o usuario eliminado.',
  })
  @UseGuards(AuthGuard)
  me(@Req() request: AuthRequest): Promise<UserResponseDto> {
    return this.auth.getUser(request.userId);
  }

  @Post('logout')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Cerrar la sesión del navegador',
    description:
      'Elimina la cookie session mediante Set-Cookie. No revoca un JWT copiado: permanece válido hasta vencer. No necesita cuerpo, pero requiere Content-Type: application/json.',
  })
  @ApiConsumes('application/json')
  @ApiNoContentResponse({
    description: 'Cookie eliminada. Respuesta sin cuerpo.',
  })
  @ApiResponse({
    status: 403,
    description: 'Solicitud desde otro sitio rechazada.',
  })
  @ApiResponse({
    status: 415,
    description: 'Se requiere Content-Type: application/json.',
  })
  logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie('session', cookieOptions);
  }

  private async setSession(response: Response, id: string, remember: boolean) {
    response.cookie('session', await this.auth.createToken(id, remember), {
      ...cookieOptions,
      ...(remember ? { maxAge: sessionSeconds(true) * 1000 } : {}),
    });
  }
}
