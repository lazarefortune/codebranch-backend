import { HttpStatus } from '@nestjs/common';
import { CustomException } from '@/common/exceptions';

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

export class TechnologyAlreadyExistsException extends CustomException {
  constructor() {
    super({
      code: 'TECHNOLOGY_ALREADY_EXISTS',
      message: 'A technology with this name already exists',
      status: HttpStatus.CONFLICT,
    });
  }
}
