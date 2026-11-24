import { transaccionConReintento } from '../prisma/transaccion-con-reintento';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import type { DomicilioInput } from '../accounts/account.schemas';
import { resolverDireccion } from '../direccion/direccion-referencia';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateUserInput, UpdateUserInput } from './user.schemas';
import { publicUserSelect, toUserResponse } from './user.select';
import { Role } from '../generated/prisma/enums';
import { Prisma } from '../generated/prisma/client';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: Omit<CreateUserInput, 'role'>, role: Role) {
    const { password, cliente, ...account } = dto;
    const passwordHash = await bcrypt.hash(password, 12);
    return transaccionConReintento(this.prisma, async (tx) => {
      const domicilios = await this.resolverDomicilios(tx, cliente.domicilios);
      const user = await tx.user.create({
        data: {
          ...account,
          role,
          passwordHash,
          cliente: {
            create: {
              name: cliente.name,
              lastName: cliente.lastName,
              domicilios: { create: domicilios },
            },
          },
        },
        select: publicUserSelect,
      });
      return toUserResponse(user);
    });
  }

  async findAll() {
    const users = await this.prisma.user.findMany({
      select: publicUserSelect,
      orderBy: { id: 'asc' },
    });
    return users.map(toUserResponse);
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: publicUserSelect,
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return toUserResponse(user);
  }

  async elegirDomicilio(usuarioId: string, direccionId: string) {
    const domicilio = await this.prisma.clienteDireccion.findFirst({
      where: { direccionId, cliente: { userId: usuarioId } },
      select: { clienteId: true },
    });
    if (!domicilio) throw new NotFoundException('Domicilio no encontrado');
    const { clienteId } = domicilio;
    try {
      await this.prisma.preferenciaDomicilio.upsert({
        where: { clienteId },
        create: { clienteId, direccionId },
        update: { direccionId },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new NotFoundException('Domicilio no encontrado');
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateUserInput) {
    const { password, cliente, ...account } = dto;
    const passwordHash =
      password === undefined ? undefined : await bcrypt.hash(password, 12);
    return transaccionConReintento(
      this.prisma,
      async (tx) => {
        const data: Prisma.UserUpdateInput = { ...account };
        if (passwordHash !== undefined) data.passwordHash = passwordHash;
        if (cliente) {
          const { domicilios, ...profile } = cliente;
          const vinculos =
            domicilios && (await this.resolverDomicilios(tx, domicilios));
          data.cliente = {
            upsert: {
              create: {
                ...profile,
                domicilios: vinculos && { create: vinculos },
              },
              update: {
                ...profile,
                domicilios: vinculos && {
                  deleteMany: {
                    direccionId: {
                      notIn: vinculos.map(({ direccionId }) => direccionId),
                    },
                  },
                  updateMany: vinculos.map(({ direccionId, etiqueta }) => ({
                    where: { direccionId },
                    data: { etiqueta: etiqueta ?? null },
                  })),
                  ...(vinculos.length && {
                    createMany: { data: vinculos, skipDuplicates: true },
                  }),
                },
              },
            },
          };
        }
        const user = await tx.user.update({
          where: { id },
          data,
          select: publicUserSelect,
        });
        return toUserResponse(user);
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  private async resolverDomicilios(
    tx: Prisma.TransactionClient,
    domicilios: readonly DomicilioInput[],
  ): Promise<{ direccionId: string; etiqueta?: string | null }[]> {
    const vinculos = new Map<
      string,
      { direccionId: string; etiqueta?: string | null }
    >();
    for (const referencia of domicilios) {
      const { id } = await resolverDireccion(tx, referencia);
      if (vinculos.has(id)) {
        throw new BadRequestException('No se puede repetir un domicilio');
      }
      vinculos.set(id, { direccionId: id, etiqueta: referencia.etiqueta });
    }
    return [...vinculos.values()];
  }

  async remove(id: string) {
    await this.prisma.user.delete({ where: { id } });
  }
}
