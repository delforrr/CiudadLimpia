import type { Response } from 'express';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('Session cookie configuration', () => {
  afterEach(() => jest.restoreAllMocks());

  it.each(['production', 'development'])(
    'uses the loaded %s environment when setting and clearing the cookie',
    async (environment) => {
      jest.replaceProperty(process.env, 'NODE_ENV', environment);
      const user = { id: 'user-1' };
      const auth = {
        login: jest.fn().mockResolvedValue(user),
        createToken: jest.fn().mockResolvedValue('test-token'),
      };
      const response = { cookie: jest.fn(), clearCookie: jest.fn() };
      const controller = new AuthController(auth as unknown as AuthService);

      await controller.login(
        { email: 'ana@example.com', password: 'test-password' },
        response as unknown as Response,
      );
      const options = {
        httpOnly: true,
        secure: environment === 'production',
        sameSite: 'strict',
        path: '/',
      };
      expect(response.cookie).toHaveBeenCalledWith(
        'session',
        'test-token',
        options,
      );
      controller.logout(response as unknown as Response);
      expect(response.clearCookie).toHaveBeenCalledWith('session', options);
    },
  );
});
