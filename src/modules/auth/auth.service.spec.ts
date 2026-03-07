import * as argon2 from 'argon2';
import { nanoid } from 'nanoid';
import { AuthService } from './auth.service';
import {
  EmailAlreadyExistsException,
  InvalidCredentialsException,
  EmailNotVerifiedException,
  InvalidRefreshTokenException,
  InvalidCodeException,
} from './exceptions';

type PrismaMock = {
  user: {
    findUnique: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
  verificationCode: {
    create: jest.Mock;
    findFirst: jest.Mock;
    update: jest.Mock;
  };
  refreshToken: {
    create: jest.Mock<Promise<unknown>, [Record<string, unknown>]>;
    findMany: jest.Mock;
    update: jest.Mock;
    updateMany: jest.Mock;
  };
  passwordReset: {
    create: jest.Mock<Promise<unknown>, [Record<string, unknown>]>;
    findFirst: jest.Mock;
    findMany: jest.Mock;
    update: jest.Mock;
  };
  $transaction: jest.Mock;
};

type JwtServiceMock = {
  signAsync: jest.Mock;
};

type ConfigServiceMock = {
  get: jest.Mock;
  getOrThrow: jest.Mock;
};

type MailerServiceMock = {
  sendVerificationEmail: jest.Mock;
  sendPasswordResetEmail: jest.Mock;
};

jest.mock('nanoid', () => ({
  nanoid: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaMock;
  let jwtService: JwtServiceMock;
  let configService: ConfigServiceMock;
  let mailerService: MailerServiceMock;

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      verificationCode: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      refreshToken: {
        create: jest.fn<Promise<unknown>, [Record<string, unknown>]>(),
        findMany: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      passwordReset: {
        create: jest.fn<Promise<unknown>, [Record<string, unknown>]>(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    jwtService = {
      signAsync: jest.fn(),
    };

    configService = {
      get: jest.fn((key: string) => {
        if (key === 'jwt.accessExpiresIn') return '15m';
        if (key === 'jwt.refreshExpiresIn') return '7d';
        return undefined;
      }),
      getOrThrow: jest.fn((key: string) => {
        if (key === 'jwt.accessSecret') return 'access-secret';
        if (key === 'jwt.refreshSecret') return 'refresh-secret';
        throw new Error(`Missing key: ${key}`);
      }),
    };

    mailerService = {
      sendVerificationEmail: jest.fn(),
      sendPasswordResetEmail: jest.fn(),
    };

    service = new AuthService(
      prisma as never,
      jwtService as never,
      configService as never,
      mailerService as never,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('register should throw when email already exists', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u1' });

    await expect(
      service.register({ email: 'user@example.com', password: 'Password123!' }),
    ).rejects.toBeInstanceOf(EmailAlreadyExistsException);
  });

  it('register should create user and send verification code', async () => {
    jest.spyOn(argon2, 'hash').mockResolvedValue('hashed-password' as never);
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({
      id: 'u1',
      email: 'user@example.com',
      emailVerifiedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    prisma.verificationCode.create.mockResolvedValue({});
    mailerService.sendVerificationEmail.mockResolvedValue(undefined);

    const result = await service.register({
      email: 'user@example.com',
      password: 'Password123!',
    });

    expect(result).toHaveProperty('user.id', 'u1');
    expect(result).toHaveProperty('next.action', 'VERIFY_EMAIL_CODE');
    expect(prisma.verificationCode.create).toHaveBeenCalled();
    expect(mailerService.sendVerificationEmail).toHaveBeenCalledWith(
      'user@example.com',
      expect.any(String),
    );
  });

  it('login should throw when user does not exist', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      service.login({ email: 'missing@example.com', password: 'Password123!' }),
    ).rejects.toBeInstanceOf(InvalidCredentialsException);
  });

  it('login should throw when email is not verified', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'user@example.com',
      passwordHash: 'stored-hash',
      emailVerifiedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    jest.spyOn(argon2, 'verify').mockResolvedValue(true as never);

    await expect(
      service.login({ email: 'user@example.com', password: 'Password123!' }),
    ).rejects.toBeInstanceOf(EmailNotVerifiedException);
  });

  it('login should return tokens and persist hashed refresh token', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'user@example.com',
      passwordHash: 'stored-hash',
      emailVerifiedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    jest.spyOn(argon2, 'verify').mockResolvedValue(true as never);
    jest
      .spyOn(argon2, 'hash')
      .mockResolvedValue('hashed-refresh-token' as never);

    jwtService.signAsync
      .mockResolvedValueOnce('access-token')
      .mockResolvedValueOnce('refresh-token');

    prisma.refreshToken.create.mockResolvedValue({});

    const result = await service.login({
      email: 'user@example.com',
      password: 'Password123!',
    });

    expect(result.accessToken).toBe('access-token');
    expect(result.refreshToken).toBe('refresh-token');
    const refreshCreateArgs: unknown[] =
      prisma.refreshToken.create.mock.calls[0] ?? [];
    const refreshCreateInput = refreshCreateArgs[0] as {
      data?: { userId?: string; tokenHash?: string };
    };

    expect(refreshCreateInput.data?.userId).toBe('u1');
    expect(refreshCreateInput.data?.tokenHash).toBe('hashed-refresh-token');
  });

  it('refreshTokens should throw when user does not exist', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      service.refreshTokens('u1', 'refresh-token'),
    ).rejects.toBeInstanceOf(InvalidRefreshTokenException);
  });

  it('verifyEmail should throw when code is invalid', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'user@example.com',
    });
    prisma.verificationCode.findFirst.mockResolvedValue(null);

    await expect(
      service.verifyEmail({ email: 'user@example.com', code: '000000' }),
    ).rejects.toBeInstanceOf(InvalidCodeException);
  });

  it('forgotPassword should return SENT and not send email for unknown user', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      service.forgotPassword({ email: 'unknown@example.com' }),
    ).resolves.toEqual({ status: 'SENT' });

    expect(prisma.passwordReset.create).not.toHaveBeenCalled();
    expect(mailerService.sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it('forgotPassword should create reset token and send email for known user', async () => {
    (nanoid as jest.Mock).mockReturnValue('reset-token');

    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'user@example.com',
    });
    prisma.passwordReset.create.mockResolvedValue({});
    mailerService.sendPasswordResetEmail.mockResolvedValue(undefined);

    await expect(
      service.forgotPassword({ email: 'user@example.com' }),
    ).resolves.toEqual({ status: 'SENT' });

    const passwordResetCreateArgs: unknown[] =
      prisma.passwordReset.create.mock.calls[0] ?? [];
    const passwordResetCreateInput = passwordResetCreateArgs[0] as {
      data?: { userId?: string; tokenHash?: string };
    };

    expect(passwordResetCreateInput.data?.userId).toBe('u1');
    // tokenHash is now SHA-256 hex digest
    expect(passwordResetCreateInput.data?.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(mailerService.sendPasswordResetEmail).toHaveBeenCalledWith(
      'user@example.com',
      'reset-token',
    );
  });
});
