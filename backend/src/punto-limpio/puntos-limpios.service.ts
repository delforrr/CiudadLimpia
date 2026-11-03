import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TipoPuntoLimpioService } from '../tipo-punto-limpio/tipo-punto-limpio.service';

@Injectable()
export class PuntosLimpiosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tipoPuntoLimpio: TipoPuntoLimpioService,
  ) {}
}
