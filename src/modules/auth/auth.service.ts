import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { createHash, randomInt } from 'crypto';
import { nanoid } from 'nanoid';
import { PrismaService } from '@/common/prisma';
import { MailerService } from '@/common/mailer';
import {
  EmailAlreadyExistsException,
  InvalidCredentialsException,
  EmailNotVerifiedException,
  InvalidCodeException,
  CodeExpiredException,
  InvalidRefreshTokenException,
  TokenInvalidException,
  TokenExpiredException,
  AlreadyVerifiedException,
} from './exceptions';
import { UserNotFoundException } from '@/modules/users/exceptions';
import {
  RegisterDto,
  LoginDto,
  VerifyEmailDto,
  ResendCodeDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailerService: MailerService,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existingUser) throw new EmailAlreadyExistsException();

    const passwordHash = await argon2.hash(dto.password);
    const user = await this.prisma.user.create({
      data: { email: dto.email.toLowerCase(), passwordHash },
      select: {
        id: true,
        email: true,
        emailVerifiedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await this.createAndSendVerificationCode(user.id, user.email);
    return { user, next: { action: 'VERIFY_EMAIL_CODE' } };
  }

  async verifyEmail(dto: VerifyEmailDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (!user) throw new UserNotFoundException();

    const verificationCode = await this.prisma.verificationCode.findFirst({
      where: { userId: user.id, code: dto.code, usedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (!verificationCode) throw new InvalidCodeException();
    if (verificationCode.expiresAt < new Date())
      throw new CodeExpiredException();

    await this.prisma.$transaction([
      this.prisma.verificationCode.update({
        where: { id: verificationCode.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: user.id },
        data: { emailVerifiedAt: new Date() },
      }),
    ]);

    const updatedUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        emailVerifiedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return { status: 'VERIFIED', user: updatedUser };
  }

  async resendVerificationCode(dto: ResendCodeDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (!user) throw new UserNotFoundException();
    if (user.emailVerifiedAt) throw new AlreadyVerifiedException();

    await this.createAndSendVerificationCode(user.id, user.email);
    return { status: 'SENT' };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (!user) throw new InvalidCredentialsException();

    const isPasswordValid = await argon2.verify(
      user.passwordHash,
      dto.password,
    );
    if (!isPasswordValid) throw new InvalidCredentialsException();
    if (!user.emailVerifiedAt) throw new EmailNotVerifiedException();

    const tokens = await this.generateTokens(user.id, user.email);
    const tokenHash = await argon2.hash(tokens.refreshToken);

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        emailVerifiedAt: user.emailVerifiedAt,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    };
  }

  async refreshTokens(userId: string, refreshToken: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new InvalidRefreshTokenException();

    const refreshTokens = await this.prisma.refreshToken.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
    });

    let matchedTokenId: string | null = null;
    for (const storedToken of refreshTokens) {
      try {
        if (await argon2.verify(storedToken.tokenHash, refreshToken)) {
          matchedTokenId = storedToken.id;
          break;
        }
      } catch {
        continue;
      }
    }
    if (!matchedTokenId) throw new InvalidRefreshTokenException();

    const tokens = await this.generateTokens(user.id, user.email);
    const tokenHash = await argon2.hash(tokens.refreshToken);

    await this.prisma.$transaction([
      this.prisma.refreshToken.update({
        where: { id: matchedTokenId },
        data: { revokedAt: new Date() },
      }),
      this.prisma.refreshToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      }),
    ]);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async logout(userId: string, refreshToken: string) {
    const refreshTokens = await this.prisma.refreshToken.findMany({
      where: { userId, revokedAt: null },
    });

    for (const storedToken of refreshTokens) {
      try {
        if (await argon2.verify(storedToken.tokenHash, refreshToken)) {
          await this.prisma.refreshToken.update({
            where: { id: storedToken.id },
            data: { revokedAt: new Date() },
          });
          break;
        }
      } catch {
        continue;
      }
    }
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (!user) return { status: 'SENT' };

    const token = nanoid(32);
    const tokenHash = await argon2.hash(token);
    const tokenLookupHash = this.hashTokenForLookup(token);

    await this.prisma.passwordReset.create({
      data: {
        userId: user.id,
        tokenHash,
        tokenLookupHash,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    await this.mailerService.sendPasswordResetEmail(user.email, token);
    return { status: 'SENT' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const tokenLookupHash = this.hashTokenForLookup(dto.token);
    const resetCandidate = await this.prisma.passwordReset.findFirst({
      where: { tokenLookupHash, usedAt: null },
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!resetCandidate) {
      throw new TokenInvalidException();
    }

    if (resetCandidate.expiresAt < new Date()) {
      throw new TokenExpiredException();
    }

    const isTokenValid = await argon2.verify(resetCandidate.tokenHash, dto.token);
    if (!isTokenValid) {
      throw new TokenInvalidException();
    }

    const passwordHash = await argon2.hash(dto.newPassword);

    await this.prisma.$transaction([
      this.prisma.passwordReset.update({
        where: { id: resetCandidate.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: resetCandidate.userId },
        data: { passwordHash },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: resetCandidate.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    return { status: 'RESET' };
  }

  private async generateTokens(userId: string, email: string) {
    type JwtSignOptions = Parameters<JwtService['signAsync']>[1];
    type JwtExpiresIn = NonNullable<JwtSignOptions>['expiresIn'];

    const accessPayload = { sub: userId, email, type: 'access' as const };
    const refreshPayload = { sub: userId, email, type: 'refresh' as const };
    const accessExpiresIn = (this.configService.get<string>(
      'jwt.accessExpiresIn',
    ) || '15m') as JwtExpiresIn;
    const refreshExpiresIn = (this.configService.get<string>(
      'jwt.refreshExpiresIn',
    ) || '7d') as JwtExpiresIn;

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload, {
        secret: this.configService.getOrThrow('jwt.accessSecret'),
        expiresIn: accessExpiresIn,
      }),
      this.jwtService.signAsync(refreshPayload, {
        secret: this.configService.getOrThrow('jwt.refreshSecret'),
        expiresIn: refreshExpiresIn,
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async createAndSendVerificationCode(userId: string, email: string) {
    const code = randomInt(100000, 1000000).toString();

    await this.prisma.verificationCode.create({
      data: { userId, code, expiresAt: new Date(Date.now() + 15 * 60 * 1000) },
    });

    await this.mailerService.sendVerificationEmail(email, code);
  }

  private hashTokenForLookup(token: string): string {
    return createHash('sha256').update(token, 'utf8').digest('hex');
  }
}
