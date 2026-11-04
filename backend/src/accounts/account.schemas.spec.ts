import { emailSchema, passwordSchema, clienteSchema } from './account.schemas';

describe('Account input contracts', () => {
  it('normalizes emails and rejects unexpected nested properties', () => {
    expect(emailSchema.parse(' ANA@example.com ')).toBe('ana@example.com');
    expect(
      clienteSchema.safeParse({
        name: 'Ana',
        lastName: 'Pérez',
        domicilios: [{ direccion: 'Casa', role: 'ADMIN' }],
      }).success,
    ).toBe(false);
  });

  it('counts Unicode characters and enforces bcrypt UTF-8 bytes without trimming', () => {
    expect(passwordSchema.safeParse('😀'.repeat(4)).success).toBe(false);
    expect(passwordSchema.safeParse('😀'.repeat(8)).success).toBe(true);
    expect(passwordSchema.safeParse('á'.repeat(37)).success).toBe(false);
    expect(passwordSchema.parse(' password ')).toBe(' password ');
  });
});
