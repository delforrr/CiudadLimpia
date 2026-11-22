import { Injectable } from '@nestjs/common';

@Injectable()
export class TipoPuntoLimpioResiduoService {
  paraAlta(residuos?: readonly string[]) {
    return residuos?.length ? { residuos: this.nuevosVinculos(residuos) } : {};
  }

  paraReemplazo(residuos?: readonly string[]) {
    if (residuos === undefined) return {};
    return {
      residuos: { deleteMany: {}, ...this.nuevosVinculos(residuos) },
    };
  }

  private nuevosVinculos(residuos: readonly string[]) {
    return { create: residuos.map((residuoId) => ({ residuoId })) };
  }
}
