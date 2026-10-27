import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { publicUserSelect } from './user.select';
import { Role } from '../generated/prisma/enums';
import type { Prisma } from '../generated/prisma/client';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  private async authorize(
    requesterId: string,
    targetId?: string,
    adminOnly = false,
  ) {
    const requester = await this.prisma.user.findUnique({
      where: { id: requesterId },
      select: { role: true },
    });
    if (!requester) throw new UnauthorizedException('Sesión inválida');
    if (requester.role !== 'ADMIN' && (adminOnly || requesterId !== targetId))
      throw new ForbiddenException('No tenés permiso para esta operación');
  }

  async create(requesterId: string, dto: CreateUserDto, role: Role) {
    await this.authorize(requesterId, undefined, true);
    const { password, cliente, ...account } = dto;
    try {
      return await this.prisma.user.create({
        data: {
          ...account,
          role,
          passwordHash: await bcrypt.hash(password, 12),
          cliente: {
            create: {
              name: cliente.name,
              lastName: cliente.lastName,
              domicilios: { create: cliente.domicilios },
            },
          },
        },
        select: publicUserSelect,
      });
    } catch (error: unknown) {
      this.rethrow(error);
    }
  }

  async findAll(requesterId: string) {
    await this.authorize(requesterId, undefined, true);
    return this.prisma.user.findMany({
      select: publicUserSelect,
      orderBy: { id: 'asc' },
    });
  }

  async findOne(requesterId: string, id: string) {
    await this.authorize(requesterId, id);
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: publicUserSelect,
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  async update(requesterId: string, id: string, dto: UpdateUserDto) {
    await this.authorize(requesterId, id, dto.role !== undefined);
    const { password, cliente, ...account } = dto;
    const domicilios = cliente?.domicilios;
    if (domicilios === undefined) {
      const current = await this.prisma.user.findUnique({
        where: { id },
        select: {
          cliente: {
            select: { domicilios: { take: 1, select: { id: true } } },
          },
        },
      });
      if (!current) throw new NotFoundException('Usuario no encontrado');
      if (!current.cliente?.domicilios.length) {
        throw new BadRequestException(
          'Completá al menos un domicilio para guardar tus datos',
        );
      }
    }
    try {
      const data: Prisma.UserUpdateInput = { ...account };
      if (password !== undefined) {
        data.passwordHash = await bcrypt.hash(password, 12);
      }
      if (cliente) {
        const profile = { name: cliente.name, lastName: cliente.lastName };
        if (domicilios === undefined) {
          data.cliente = { update: profile };
        } else {
          data.cliente = {
            upsert: {
              create: { ...profile, domicilios: { create: domicilios } },
              update: {
                ...profile,
                domicilios: { deleteMany: {}, create: domicilios },
              },
            },
          };
        }
      }
      return await this.prisma.user.update({
        where: { id },
        data,
        select: publicUserSelect,
      });
    } catch (error: unknown) {
      this.rethrow(error);
    }
  }

  async remove(requesterId: string, id: string) {
    await this.authorize(requesterId, undefined, true);
    try {
      await this.prisma.user.delete({ where: { id } });
    } catch (error: unknown) {
      this.rethrow(error);
    }
  }

  private rethrow(error: unknown): never {
    if (typeof error === 'object' && error !== null && 'code' in error) {
      if (error.code === 'P2002')
        throw new ConflictException('Ya existe una cuenta con ese email');
      if (error.code === 'P2025')
        throw new NotFoundException('Usuario no encontrado');
    }
    throw error;
  }
}
