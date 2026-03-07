import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  it('should return user data for access payload', () => {
    const configService = {
      getOrThrow: jest.fn().mockReturnValue('access-secret'),
    } as unknown as ConfigService;

    const strategy = new JwtStrategy(configService);

    const result = strategy.validate({
      sub: 'u1',
      email: 'user@example.com',
      type: 'access',
    });

    expect(result).toEqual({ id: 'u1', email: 'user@example.com' });
  });

  it('should return null for non-access payload', () => {
    const configService = {
      getOrThrow: jest.fn().mockReturnValue('access-secret'),
    } as unknown as ConfigService;

    const strategy = new JwtStrategy(configService);

    const result = strategy.validate({
      sub: 'u1',
      email: 'user@example.com',
      type: 'refresh',
    });

    expect(result).toBeNull();
  });
});
