import { transaccionConReintento } from '../prisma/transaccion-con-reintento';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { Estado } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { contratoConductorSelect } from './contratos-conductor.select';
import {
  ContratoConductorIdDto,
  CreateContratoConductorDto,
  UpdateContratoConductorDto,
} from './dto/contrato-conductor.dto';

type ContratoId = Omit<ContratoConductorIdDto, 'fechaInicio'> & {
  fechaInicio: Date;
};

@Injectable()
export class ContratosConductorService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.contratoConductor.findMany({
      select: contratoConductorSelect,
      orderBy: [
        { fechaInicio: 'desc' },
        { idCamion: 'asc' },
        { idConductor: 'asc' },
      ],
    });
  }

  async findOne(dto: ContratoConductorIdDto) {
    const contrato = await this.prisma.contratoConductor.findUnique({
      where: { idCamion_idConductor_fechaInicio: this.identificar(dto) },
      select: contratoConductorSelect,
    });
    if (!contrato) throw new NotFoundException('Contrato no encontrado');
    return contrato;
  }

  async findContratoVigente(id: string) {
    const ahora = new Date();
    const camion = await this.prisma.camion.findUnique({
      where: { id },
      select: {
        contratos: {
          where: {
            fechaInicio: { lte: ahora },
            OR: [{ fechaFin: null }, { fechaFin: { gt: ahora } }],
          },
          select: contratoConductorSelect,
          orderBy: { fechaInicio: 'desc' },
          take: 1,
        },
      },
    });
    if (!camion) throw new NotFoundException('Camión no encontrado');
    return camion.contratos[0] ?? null;
  }

  create(dto: CreateContratoConductorDto) {
    const id = this.identificar(dto);
    const fechaFin = dto.fechaFin ? new Date(dto.fechaFin) : null;

    return this.escribir(async (tx) => {
      const [camion, conductor] = await Promise.all([
        tx.camion.findUnique({
          where: { id: id.idCamion },
          select: { estado: true },
        }),
        tx.conductor.findUnique({
          where: { id: id.idConductor },
          select: { activo: true },
        }),
      ]);
      if (!camion) throw new NotFoundException('Camión no encontrado');
      if (!conductor) throw new NotFoundException('Conductor no encontrado');
      if (camion.estado === Estado.INACTIVO || !conductor.activo) {
        throw new ConflictException(
          'El camión y el conductor deben estar activos',
        );
      }

      await this.validarPeriodo(tx, id, fechaFin);
      return tx.contratoConductor.create({
        data: { ...id, fechaFin },
        select: contratoConductorSelect,
      });
    });
  }

  update(dto: ContratoConductorIdDto, body: UpdateContratoConductorDto) {
    const id = this.identificar(dto);
    const fechaFin = body.fechaFin === null ? null : new Date(body.fechaFin);

    return this.escribir(async (tx) => {
      const contrato = await tx.contratoConductor.update({
        where: { idCamion_idConductor_fechaInicio: id },
        data: { fechaFin },
        select: contratoConductorSelect,
      });
      await this.validarPeriodo(tx, id, fechaFin, id);
      return contrato;
    });
  }

  private identificar({
    idCamion,
    idConductor,
    fechaInicio,
  }: ContratoConductorIdDto): ContratoId {
    return { idCamion, idConductor, fechaInicio: new Date(fechaInicio) };
  }

  private async validarPeriodo(
    tx: Prisma.TransactionClient,
    { idCamion, idConductor, fechaInicio }: ContratoId,
    fechaFin: Date | null,
    excluir?: ContratoId,
  ): Promise<void> {
    if (fechaFin && fechaFin <= fechaInicio) {
      throw new BadRequestException(
        'La fecha de fin debe ser posterior a la de inicio',
      );
    }

    const solapado = await tx.contratoConductor.findFirst({
      where: {
        AND: [
          { OR: [{ idCamion }, { idConductor }] },
          { OR: [{ fechaFin: null }, { fechaFin: { gt: fechaInicio } }] },
          fechaFin ? { fechaInicio: { lt: fechaFin } } : {},
        ],
        NOT: excluir,
      },
      select: { idCamion: true },
    });
    if (solapado) {
      throw new ConflictException(
        'El camión o el conductor ya tiene un contrato en ese período',
      );
    }
  }

  private escribir<T>(operacion: (tx: Prisma.TransactionClient) => Promise<T>) {
    return transaccionConReintento(
      this.prisma,
      operacion,
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      'Cambió un contrato durante la operación. Volvé a intentar.',
    );
  }
}
