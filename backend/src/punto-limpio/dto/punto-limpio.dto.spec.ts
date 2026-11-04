import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreatePuntoLimpioDto } from './create-punto-limpio.dto';
import { UpdatePuntoLimpioDto } from './update-punto-limpio.dto';

const punto = {
  nombre: '  Parque Villegas  ',
  tipoId: '00000000-0000-4000-8000-000000000001',
  direccionId: '00000000-0000-4000-8000-000000000002',
  lat: -35.97,
  long: -62.73,
};

describe('CreatePuntoLimpioDto', () => {
  it('acepta datos válidos y recorta el nombre', async () => {
    const dto = plainToInstance(CreatePuntoLimpioDto, punto);
    expect(await validate(dto)).toEqual([]);
    expect(dto.nombre).toBe('Parque Villegas');
  });

  it.each([
    { nombre: ' ' },
    { nombre: 'a'.repeat(101) },
    { tipoId: 'inválido' },
    { direccionId: null },
    { lat: 91 },
    { lat: -91 },
    { lat: '-35.97' },
    { lat: NaN },
    { long: 181 },
    { long: -181 },
    { long: Infinity },
  ])('rechaza datos inválidos: %j', async (cambio) => {
    const dto = plainToInstance(CreatePuntoLimpioDto, { ...punto, ...cambio });
    expect((await validate(dto)).length).toBeGreaterThan(0);
  });

  it('acepta una dirección nueva con calle y altura', async () => {
    const dto = plainToInstance(CreatePuntoLimpioDto, {
      ...punto,
      direccionId: undefined,
      direccion: { calle: '  San   Martín ', altura: 123 },
    });
    expect(await validate(dto)).toEqual([]);
    expect(dto.direccion).toEqual(
      expect.objectContaining({ calle: 'San Martín', altura: 123 }),
    );
  });

  it('exige los campos obligatorios', async () => {
    const errores = await validate(new CreatePuntoLimpioDto());
    expect(errores.map((error) => error.property).sort()).toEqual(
      ['nombre', 'tipoId', 'direccionId', 'lat', 'long'].sort(),
    );
  });
});

describe('UpdatePuntoLimpioDto', () => {
  it.each([{}, { nombre: ' Nuevo nombre ' }, { lat: 0, long: 0 }])(
    'acepta actualizaciones parciales: %j',
    async (cambio) => {
      expect(
        await validate(plainToInstance(UpdatePuntoLimpioDto, cambio)),
      ).toEqual([]);
    },
  );

  it.each(['nombre', 'tipoId', 'direccionId', 'lat', 'long'])(
    'rechaza null en %s',
    async (campo) => {
      const dto = plainToInstance(UpdatePuntoLimpioDto, { [campo]: null });
      expect((await validate(dto)).map((error) => error.property)).toContain(
        campo,
      );
    },
  );
});
