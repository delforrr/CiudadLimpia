import { mergeConfig } from 'jest-config';

describe('Jest configuration dependency', () => {
  it('merges nested configuration without inheriting injected properties', () => {
    const session = JSON.parse('{"__proto__":{"admin":true}}') as object;
    const config = mergeConfig(
      { globals: { session: null, enabled: true } },
      { globals: { session } },
    );

    expect(config.globals).toEqual({ session: {}, enabled: true });
    expect(config.globals?.session).not.toHaveProperty('admin');
    expect(Object.getPrototypeOf(config.globals?.session as object)).toBe(
      Object.prototype,
    );
  });
});
