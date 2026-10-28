import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import type { LoginRequest, RegisterRequest } from './auth.schemas';
import { UserService } from '../user/user.service';
import { Role } from '../generated/prisma/enums';
import { publicUserSelect } from '../user/user.select';

export const sessionSeconds = (remember: boolean) =>
  remember ? 7 * 24 * 3600 : 3600;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly users: UserService,
  ) {}

  register(dto: RegisterRequest) {
    return this.users.create(dto, Role.USER);
  }

  async login(dto: LoginRequest) {
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
    const { passwordHash, ...publicUser } = user;
    void passwordHash;
    return publicUser;
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
    return user;
  }
}
