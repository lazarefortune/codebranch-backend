import { HttpStatus } from '@nestjs/common';
import { CustomException } from './custom.exception';

export class ForbiddenException extends CustomException {
  constructor() {
    super({
      code: 'FORBIDDEN',
      message: 'You do not have permission to perform this action',
      status: HttpStatus.FORBIDDEN,
    });
  }
}
