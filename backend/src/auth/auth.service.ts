import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginRequestDto } from './dto/login-request.dto';
import { SigninRequestDto } from './dto/signin-request.dto';
import { publicUserSelect, toUserResponse } from '../user/user.select';
import { UserService } from '../user/user.service';
import { Role } from '../generated/prisma/enums';

export const sessionSeconds = (remember: boolean) =>
  remember ? 7 * 24 * 3600 : 3600;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly users: UserService,
  ) {}

  async register(dto: SigninRequestDto) {
    if (dto.password !== dto.repeatedPassword) {
      throw new BadRequestException('Las contraseñas no coinciden');
    }
    return this.users.create(
      {
        email: dto.email,
        password: dto.password,
        cliente: {
          name: dto.name,
          lastName: dto.lastName,
          domicilios: dto.domicilios,
        },
      },
      Role.USER,
    );
  }

  async login(dto: LoginRequestDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { ...publicUserSelect, passwordHash: true },
    });
    // Compare even for unknown emails to avoid a fast account-enumeration path.
    const hash =
      user?.passwordHash ??
      '$2b$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW';
    const matches = await bcrypt.compare(dto.password, hash);
    if (!user || !matches)
      throw new UnauthorizedException('Email o contraseña incorrectos');
    return toUserResponse(user);
  }

  createToken(id: string, remember: boolean) {
    return this.jwt.signAsync(
      { sub: id },
      { expiresIn: sessionSeconds(remember) },
    );
  }

  async getUser(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: publicUserSelect,
    });
    if (!user) throw new UnauthorizedException('Sesión inválida');
    return toUserResponse(user);
  }
}
