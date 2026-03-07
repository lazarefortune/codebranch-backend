import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy, StrategyOptionsWithRequest } from 'passport-jwt';
import { Request } from 'express';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

function getRefreshCookie(request: unknown): string | undefined {
  if (!request || typeof request !== 'object') {
    return undefined;
  }

  const maybeCookies = (request as { cookies?: unknown }).cookies;
  if (!maybeCookies || typeof maybeCookies !== 'object') {
    return undefined;
  }

  const refreshToken = (maybeCookies as Record<string, unknown>).cb_refresh;
  return typeof refreshToken === 'string' ? refreshToken : undefined;
}

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(configService: ConfigService) {
    const options: StrategyOptionsWithRequest = {
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          return getRefreshCookie(request) ?? null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('jwt.refreshSecret'),
      passReqToCallback: true,
    };
    super(options);
  }

  validate(
    request: Request,
    payload: JwtPayload,
  ): { id: string; email: string; refreshToken: string } | null {
    if (payload.type !== 'refresh') {
      return null;
    }
    const refreshToken = getRefreshCookie(request);
    if (!refreshToken) {
      return null;
    }
    return {
      id: payload.sub,
      email: payload.email,
      refreshToken,
    };
  }
}
