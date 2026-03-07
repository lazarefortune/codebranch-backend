import { ConfigService } from '@nestjs/config';
import { JwtRefreshStrategy } from './jwt-refresh.strategy';

describe('JwtRefreshStrategy', () => {
  it('should return user data and refresh token for refresh payload', () => {
    const configService = {
      getOrThrow: jest.fn().mockReturnValue('refresh-secret'),
    } as unknown as ConfigService;

    const strategy = new JwtRefreshStrategy(configService);

    const request = {
      cookies: {
        cb_refresh: 'refresh-token',
      },
    };

    const result = strategy.validate(request as never, {
      sub: 'u1',
      email: 'user@example.com',
      type: 'refresh',
    });

    expect(result).toEqual({
      id: 'u1',
      email: 'user@example.com',
      refreshToken: 'refresh-token',
    });
  });

  it('should return null for non-refresh payload', () => {
    const configService = {
      getOrThrow: jest.fn().mockReturnValue('refresh-secret'),
    } as unknown as ConfigService;

    const strategy = new JwtRefreshStrategy(configService);

    const request = {
      cookies: {
        cb_refresh: 'refresh-token',
      },
    };

    const result = strategy.validate(request as never, {
      sub: 'u1',
      email: 'user@example.com',
      type: 'access',
    });

    expect(result).toBeNull();
  });

  it('should return null when refresh cookie is missing', () => {
    const configService = {
      getOrThrow: jest.fn().mockReturnValue('refresh-secret'),
    } as unknown as ConfigService;

    const strategy = new JwtRefreshStrategy(configService);

    const request = { cookies: {} };

    const result = strategy.validate(request as never, {
      sub: 'u1',
      email: 'user@example.com',
      type: 'refresh',
    });

    expect(result).toBeNull();
  });
});
