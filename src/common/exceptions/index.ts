import { HttpException, HttpStatus } from '@nestjs/common';

interface CustomExceptionOptions {
  code: string;
  message: string;
  status?: HttpStatus;
  details?: Array<{ field: string; message: string }>;
}

export class CustomException extends HttpException {
  constructor(options: CustomExceptionOptions) {
    const { code, message, status = HttpStatus.BAD_REQUEST, details } = options;
    super({ code, message, details }, status);
  }
}

// Auth exceptions
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

export class UserNotFoundException extends CustomException {
  constructor() {
    super({
      code: 'USER_NOT_FOUND',
      message: 'User not found',
      status: HttpStatus.NOT_FOUND,
    });
  }
}

// Page exceptions
export class PageNotFoundException extends CustomException {
  constructor() {
    super({
      code: 'PAGE_NOT_FOUND',
      message: 'Page not found',
      status: HttpStatus.NOT_FOUND,
    });
  }
}

export class PageNotPublicException extends CustomException {
  constructor() {
    super({
      code: 'PAGE_NOT_PUBLIC',
      message: 'This page is not public',
      status: HttpStatus.FORBIDDEN,
    });
  }
}

export class UsernameTakenException extends CustomException {
  constructor() {
    super({
      code: 'USERNAME_TAKEN',
      message: 'This username is already taken',
      status: HttpStatus.CONFLICT,
    });
  }
}

// Block exceptions
export class BlockNotFoundException extends CustomException {
  constructor() {
    super({
      code: 'BLOCK_NOT_FOUND',
      message: 'Block not found',
      status: HttpStatus.NOT_FOUND,
    });
  }
}

export class InvalidBlockTypeException extends CustomException {
  constructor() {
    super({
      code: 'INVALID_BLOCK_TYPE',
      message: 'Invalid block type',
      status: HttpStatus.UNPROCESSABLE_ENTITY,
    });
  }
}

export class InvalidBlockDataException extends CustomException {
  constructor(details?: Array<{ field: string; message: string }>) {
    super({
      code: 'INVALID_BLOCK_DATA',
      message: 'Invalid block data',
      status: HttpStatus.UNPROCESSABLE_ENTITY,
      details,
    });
  }
}

export class HeaderRequiredException extends CustomException {
  constructor() {
    super({
      code: 'HEADER_REQUIRED',
      message: 'A page must have exactly one header block',
      status: HttpStatus.UNPROCESSABLE_ENTITY,
    });
  }
}

export class MultipleHeadersNotAllowedException extends CustomException {
  constructor() {
    super({
      code: 'MULTIPLE_HEADERS_NOT_ALLOWED',
      message: 'A page can only have one header block',
      status: HttpStatus.UNPROCESSABLE_ENTITY,
    });
  }
}

export class CannotDeleteHeaderException extends CustomException {
  constructor() {
    super({
      code: 'CANNOT_DELETE_HEADER',
      message: 'The header block cannot be deleted',
      status: HttpStatus.CONFLICT,
    });
  }
}

// Technology exceptions
export class TechnologyAlreadyExistsException extends CustomException {
  constructor() {
    super({
      code: 'TECHNOLOGY_ALREADY_EXISTS',
      message: 'A technology with this name already exists',
      status: HttpStatus.CONFLICT,
    });
  }
}

// Generic exceptions
export class ForbiddenException extends CustomException {
  constructor() {
    super({
      code: 'FORBIDDEN',
      message: 'You do not have permission to perform this action',
      status: HttpStatus.FORBIDDEN,
    });
  }
}
