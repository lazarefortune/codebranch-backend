import { HttpStatus } from '@nestjs/common';
import { CustomException } from '@/common/exceptions';

export class TechnologyAlreadyExistsException extends CustomException {
  constructor() {
    super({
      code: 'TECHNOLOGY_ALREADY_EXISTS',
      message: 'A technology with this name already exists',
      status: HttpStatus.CONFLICT,
    });
  }
}

export class TechnologyNotFoundException extends CustomException {
  constructor() {
    super({
      code: 'TECHNOLOGY_NOT_FOUND',
      message: 'Technology not found',
      status: HttpStatus.NOT_FOUND,
    });
  }
}
