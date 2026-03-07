import { HttpStatus } from '@nestjs/common';
import { CustomException } from '@/common/exceptions';

export class EmailAlreadyExistsException extends CustomException {
  constructor() {
    super({
      code: 'EMAIL_ALREADY_EXISTS',
      message: 'An account with this email already exists',
      status: HttpStatus.CONFLICT,
    });
  }
}

export class InvalidCredentialsException extends CustomException {
  constructor() {
    super({
      code: 'INVALID_CREDENTIALS',
      message: 'Invalid email or password',
      status: HttpStatus.UNAUTHORIZED,
    });
  }
}

export class EmailNotVerifiedException extends CustomException {
  constructor() {
    super({
      code: 'EMAIL_NOT_VERIFIED',
      message: 'Please verify your email before logging in',
      status: HttpStatus.FORBIDDEN,
    });
  }
}

export class InvalidCodeException extends CustomException {
  constructor() {
    super({
      code: 'INVALID_CODE',
      message: 'The verification code is invalid',
      status: HttpStatus.BAD_REQUEST,
    });
  }
}

export class CodeExpiredException extends CustomException {
  constructor() {
    super({
      code: 'CODE_EXPIRED',
      message: 'The verification code has expired',
      status: HttpStatus.BAD_REQUEST,
    });
  }
}

export class InvalidRefreshTokenException extends CustomException {
  constructor() {
    super({
      code: 'INVALID_REFRESH_TOKEN',
      message: 'Invalid or expired refresh token',
      status: HttpStatus.UNAUTHORIZED,
    });
  }
}

export class TokenInvalidException extends CustomException {
  constructor() {
    super({
      code: 'TOKEN_INVALID',
      message: 'The token is invalid',
      status: HttpStatus.BAD_REQUEST,
    });
  }
}

export class TokenExpiredException extends CustomException {
  constructor() {
    super({
      code: 'TOKEN_EXPIRED',
      message: 'The token has expired',
      status: HttpStatus.BAD_REQUEST,
    });
  }
}

export class AlreadyVerifiedException extends CustomException {
  constructor() {
    super({
      code: 'ALREADY_VERIFIED',
      message: 'This email is already verified',
      status: HttpStatus.CONFLICT,
    });
  }
}
