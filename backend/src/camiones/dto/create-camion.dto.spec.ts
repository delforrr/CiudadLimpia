import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { Estado } from '../../generated/prisma/enums';
import { CreateCamionDto } from './create-camion.dto';

const camionValido = {
  patente: ' ab 123 cd ',
  marca: '  Mercedes-Benz  ',
  modelo: '  Atego 1729  ',
};

describe('CreateCamionDto', () => {
  it('acepta datos válidos, recorta cadenas y normaliza patente a mayúsculas', async () => {
    const dto = plainToInstance(CreateCamionDto, camionValido);
    const errores = await validate(dto);

    expect(errores).toEqual([]);
    expect(dto.patente).toBe('AB 123 CD');
    expect(dto.marca).toBe('Mercedes-Benz');
    expect(dto.modelo).toBe('Atego 1729');
    expect(dto.estado).toBeUndefined();
  });

  it('acepta estado explícito válido', async () => {
    const dtoActivo = plainToInstance(CreateCamionDto, {
      ...camionValido,
      estado: Estado.ACTIVO,
    });
    expect(await validate(dtoActivo)).toEqual([]);
    expect(dtoActivo.estado).toBe(Estado.ACTIVO);

    const dtoInactivo = plainToInstance(CreateCamionDto, {
      ...camionValido,
      estado: Estado.INACTIVO,
    });
    expect(await validate(dtoInactivo)).toEqual([]);
    expect(dtoInactivo.estado).toBe(Estado.INACTIVO);
  });

  it('exige los campos obligatorios', async () => {
    const dto = new CreateCamionDto();
    const errores = await validate(dto);
    const propiedades = errores.map((e) => e.property).sort();

    expect(propiedades).toEqual(['marca', 'modelo', 'patente'].sort());
  });

  it.each([
    { patente: '' },
    { patente: ' ' },
    { patente: 'a'.repeat(21) },
    { marca: '' },
    { marca: ' ' },
    { marca: 'a'.repeat(101) },
    { modelo: '' },
    { modelo: ' ' },
    { modelo: 'a'.repeat(101) },
    { estado: 'INVALIDO' },
  ])('rechaza datos inválidos: %j', async (cambio) => {
    const dto = plainToInstance(CreateCamionDto, {
      ...camionValido,
      ...cambio,
    });
    const errores = await validate(dto);
    expect(errores.length).toBeGreaterThan(0);
  });
});
