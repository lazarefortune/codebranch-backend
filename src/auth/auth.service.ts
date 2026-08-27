import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { randomInt } from 'node:crypto';
import {
  generateOpaqueToken,
  hashOpaqueToken,
} from '../common/crypto/opaque-token';
import { generateId } from '../common/ids/generate-id';
import { AppException } from '../common/exceptions/app.exception';
import { Page, Prisma, User } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResendVerificationCodeDto } from './dto/resend-verification-code.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { MailService } from './mail/mail.service';
import { TokensService } from './tokens/tokens.service';

const VERIFICATION_CODE_TTL_MINUTES = 15;

// Used to run argon2.verify() against a non-existent user so the response
// time doesn't reveal whether the email exists (argon2 rejects an empty hash).
const DUMMY_PASSWORD_HASH =
  '$argon2id$v=19$m=65536,p=4,t=3$4nIRmbteNnn6j4C+6PhYFA$Ng0MxUi/EGvMjlIRwId0HILv9ukGoCnLqIDVUB+mJz0';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly tokens: TokensService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const passwordHash = await argon2.hash(dto.password);
    const { code, codeHash } = await this.generateVerificationCode();

    const user = await this.createUserWithPage(dto, passwordHash, codeHash);

    await this.mail.sendVerificationCode(user.email, code);

    return {
      user: this.toUserDto(user),
      next: { action: 'VERIFY_EMAIL_CODE' as const },
    };
  }

  async verifyEmail(dto: VerifyEmailDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) {
      throw new AppException(404, 'USER_NOT_FOUND', 'User not found');
    }

    const verificationCode = await this.prisma.emailVerificationCode.findFirst({
      where: { userId: user.id, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    if (!verificationCode) {
      throw new AppException(400, 'INVALID_CODE', 'Invalid verification code');
    }

    if (verificationCode.expiresAt < new Date()) {
      throw new AppException(400, 'CODE_EXPIRED', 'Verification code expired');
    }

    const isValid = await argon2.verify(verificationCode.codeHash, dto.code);
    if (!isValid) {
      await this.prisma.emailVerificationCode.update({
        where: { id: verificationCode.id },
        data: { attempts: { increment: 1 } },
      });
      throw new AppException(400, 'INVALID_CODE', 'Invalid verification code');
    }

    const [updatedUser] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: { emailVerifiedAt: new Date() },
      }),
      this.prisma.emailVerificationCode.update({
        where: { id: verificationCode.id },
        data: { consumedAt: new Date() },
      }),
    ]);

    const page = await this.prisma.page.findUniqueOrThrow({
      where: { userId: updatedUser.id },
    });

    const accessToken = this.tokens.signAccessToken(updatedUser.id);
    const refreshToken = await this.tokens.issueRefreshToken(updatedUser.id);

    return {
      status: 'VERIFIED' as const,
      accessToken,
      refreshToken,
      user: this.toUserDto(updatedUser),
      page: this.toPageDto(page),
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    const isValid = await argon2.verify(
      user?.passwordHash ?? DUMMY_PASSWORD_HASH,
      dto.password,
    );
    if (!user || !isValid) {
      throw new AppException(
        401,
        'INVALID_CREDENTIALS',
        'Invalid email or password',
      );
    }

    if (!user.emailVerifiedAt) {
      throw new AppException(
        403,
        'EMAIL_NOT_VERIFIED',
        'Email is not verified',
      );
    }

    const accessToken = this.tokens.signAccessToken(user.id);
    const refreshToken = await this.tokens.issueRefreshToken(user.id);

    return {
      accessToken,
      refreshToken,
      user: this.toUserDto(user),
    };
  }

  async refresh(rawRefreshToken: string) {
    const { userId, refreshToken } =
      await this.tokens.rotateRefreshToken(rawRefreshToken);
    const accessToken = this.tokens.signAccessToken(userId);

    return { accessToken, refreshToken };
  }

  async logout(rawRefreshToken: string | undefined): Promise<void> {
    if (rawRefreshToken) {
      await this.tokens.revokeRefreshToken(rawRefreshToken);
    }
  }

  async resendVerificationCode(dto: ResendVerificationCodeDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) {
      throw new AppException(404, 'USER_NOT_FOUND', 'User not found');
    }

    if (user.emailVerifiedAt) {
      throw new AppException(409, 'ALREADY_VERIFIED', 'Email already verified');
    }

    const { code, codeHash } = await this.generateVerificationCode();

    await this.prisma.emailVerificationCode.updateMany({
      where: { userId: user.id, consumedAt: null },
      data: { consumedAt: new Date() },
    });

    await this.prisma.emailVerificationCode.create({
      data: {
        id: generateId('evc'),
        userId: user.id,
        codeHash,
        expiresAt: new Date(
          Date.now() + VERIFICATION_CODE_TTL_MINUTES * 60_000,
        ),
      },
    });

    await this.mail.sendVerificationCode(user.email, code);

    return { status: 'SENT' as const };
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ status: 'SENT' }> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    // Always behave the same way whether or not the email exists, so the
    // response can't be used to enumerate registered accounts.
    if (user) {
      const token = generateOpaqueToken();
      const ttlMinutes = Number(
        this.config.getOrThrow('PASSWORD_RESET_TOKEN_TTL_MINUTES'),
      );

      await this.prisma.passwordResetToken.create({
        data: {
          id: generateId('prt'),
          userId: user.id,
          tokenHash: hashOpaqueToken(token),
          expiresAt: new Date(Date.now() + ttlMinutes * 60_000),
        },
      });

      await this.mail.sendPasswordResetLink(user.email, token);
    }

    return { status: 'SENT' };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ status: 'RESET' }> {
    const tokenHash = hashOpaqueToken(dto.token);
    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    if (!resetToken || resetToken.consumedAt) {
      throw new AppException(400, 'TOKEN_INVALID', 'Invalid reset token');
    }

    if (resetToken.expiresAt < new Date()) {
      throw new AppException(400, 'TOKEN_EXPIRED', 'Reset token expired');
    }

    const passwordHash = await argon2.hash(dto.newPassword);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { consumedAt: new Date() },
      }),
    ]);

    // A password reset likely means the account was compromised or the
    // owner lost access; force every existing session to re-authenticate.
    await this.tokens.revokeAllUserRefreshTokens(resetToken.userId);

    return { status: 'RESET' };
  }

  private async generateVerificationCode(): Promise<{
    code: string;
    codeHash: string;
  }> {
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    const codeHash = await argon2.hash(code);
    return { code, codeHash };
  }

  private toUserDto(user: User) {
    return {
      id: user.id,
      email: user.email,
      emailVerifiedAt: user.emailVerifiedAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private toPageDto(page: Page) {
    return {
      id: page.id,
      username: page.username,
      isPublic: page.isPublic,
      createdAt: page.createdAt,
      updatedAt: page.updatedAt,
    };
  }

  private async createUserWithPage(
    dto: RegisterDto,
    passwordHash: string,
    codeHash: string,
  ) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            id: generateId('usr'),
            email: dto.email,
            passwordHash,
          },
        });

        await tx.page.create({
          data: {
            id: generateId('pag'),
            username: dto.username,
            userId: user.id,
          },
        });

        await tx.emailVerificationCode.create({
          data: {
            id: generateId('evc'),
            userId: user.id,
            codeHash,
            expiresAt: new Date(
              Date.now() + VERIFICATION_CODE_TTL_MINUTES * 60_000,
            ),
          },
        });

        return user;
      });
    } catch (error) {
      throw this.mapUniqueConstraintError(error);
    }
  }

  private mapUniqueConstraintError(error: unknown): unknown {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      const modelName = error.meta?.modelName;
      if (modelName === 'User') {
        return new AppException(
          409,
          'EMAIL_ALREADY_EXISTS',
          'Email already exists',
        );
      }
      if (modelName === 'Page') {
        return new AppException(
          409,
          'USERNAME_TAKEN',
          'Username is already taken',
        );
      }
    }
    return error;
  }
}
