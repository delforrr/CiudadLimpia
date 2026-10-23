import {
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AuthService', () => {
  const user = {
    id: 'user-1',
    email: 'ana@example.com',
    role: 'USER' as const,
    cliente: {
      id: 'cliente-1',
      name: 'Ana',
      lastName: 'Pérez',
      domicilios: [],
    },
  };
  const dto = {
    email: user.email,
    name: 'Ana',
    lastName: 'Pérez',
    domicilios: [{ direccion: 'San Martín 123' }],
    password: ' contraseña! ',
    repeatedPassword: ' contraseña! ',
  };
  let service: AuthService;
  let db: { user: { create: jest.Mock; findUnique: jest.Mock } };

  beforeEach(() => {
    db = { user: { create: jest.fn(), findUnique: jest.fn() } };
    service = new AuthService(
      db as unknown as PrismaService,
      new JwtService({ secret: 'test-secret-only' }),
    );
  });

  it('registers with bcrypt without exposing the hash', async () => {
    db.user.create.mockImplementation(() => user);
    const result = await service.register(dto);
    const hash = (
      db.user.create.mock.calls as [{ data: { passwordHash: string } }][]
    )[0][0].data.passwordHash;
    expect(await bcrypt.compare(dto.password, hash)).toBe(true);
    expect(bcrypt.getRounds(hash)).toBe(12);
    expect(result).toEqual(user);
  });

  it('rejects mismatched confirmation before creating a user', async () => {
    await expect(
      service.register({ ...dto, repeatedPassword: 'different' }),
    ).rejects.toThrow(BadRequestException);
    expect(db.user.create).not.toHaveBeenCalled();
  });

  it('handles a duplicate email even when registrations race', async () => {
    db.user.create.mockRejectedValue({ code: 'P2002' });
    await expect(service.register(dto)).rejects.toThrow(ConflictException);
  });

  it.each([
    [false, 3600],
    [true, 604800],
  ])(
    'accepts the password and expires the JWT with rememberMe=%s',
    async (remember, duration) => {
      db.user.findUnique.mockResolvedValue({
        ...user,
        passwordHash: await bcrypt.hash(dto.password, 4),
      });
      expect(await service.login(dto)).toEqual(user);
      const token = await service.createToken(user.id, remember);
      const payload = new JwtService({ secret: 'test-secret-only' }).verify<{
        sub: string;
        exp: number;
        iat: number;
      }>(token);
      expect(payload.sub).toBe(user.id);
      expect(payload.exp - payload.iat).toBe(duration);
    },
  );

  it('uses the same error for unknown emails and incorrect passwords', async () => {
    db.user.findUnique.mockResolvedValue(null);
    await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    db.user.findUnique.mockResolvedValue({
      ...user,
      passwordHash: await bcrypt.hash('another password', 4),
    });
    await expect(service.login(dto)).rejects.toThrow(
      'Email o contraseña incorrectos',
    );
  });
});
