import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  generateOpaqueToken,
  hashOpaqueToken,
} from '../../common/crypto/opaque-token';
import { AppException } from '../../common/exceptions/app.exception';
import { generateId } from '../../common/ids/generate-id';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TokensService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  signAccessToken(userId: string): string {
    return this.jwt.sign({ sub: userId });
  }

  async issueRefreshToken(userId: string): Promise<string> {
    const token = generateOpaqueToken();
    const ttlDays = Number(this.config.getOrThrow('REFRESH_TOKEN_TTL_DAYS'));

    await this.prisma.refreshToken.create({
      data: {
        id: generateId('rft'),
        userId,
        tokenHash: hashOpaqueToken(token),
        expiresAt: new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000),
      },
    });

    return token;
  }

  async rotateRefreshToken(
    rawToken: string,
  ): Promise<{ userId: string; refreshToken: string }> {
    const tokenHash = hashOpaqueToken(rawToken);
    const existing = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (!existing) {
      throw new AppException(
        401,
        'INVALID_REFRESH_TOKEN',
        'Invalid refresh token',
      );
    }

    if (existing.revokedAt) {
      // The same token was presented twice: it was already rotated once,
      // so this is a replay of a stolen token. Revoke the whole session set.
      await this.revokeAllUserRefreshTokens(existing.userId);
      throw new AppException(
        401,
        'INVALID_REFRESH_TOKEN',
        'Invalid refresh token',
      );
    }

    if (existing.expiresAt < new Date()) {
      throw new AppException(
        401,
        'INVALID_REFRESH_TOKEN',
        'Invalid refresh token',
      );
    }

    await this.prisma.refreshToken.update({
      where: { id: existing.id },
      data: { revokedAt: new Date() },
    });

    const refreshToken = await this.issueRefreshToken(existing.userId);

    return { userId: existing.userId, refreshToken };
  }

  async revokeRefreshToken(rawToken: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: hashOpaqueToken(rawToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllUserRefreshTokens(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
