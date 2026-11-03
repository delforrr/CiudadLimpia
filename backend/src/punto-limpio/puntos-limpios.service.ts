import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TipoPuntoLimpioService } from '../tipo-punto-limpio/tipo-punto-limpio.service';
import { CreatePuntoLimpioDto } from './dto/create-punto-limpio.dto';

@Injectable()
export class PuntosLimpiosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tipoPuntoLimpio: TipoPuntoLimpioService,
  ) {}

  async create(dto: CreatePuntoLimpioDto)
}
