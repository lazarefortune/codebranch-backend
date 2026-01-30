import { HttpStatus } from '@nestjs/common';
import { CustomException } from '@/common/exceptions';

export class UserNotFoundException extends CustomException {
  constructor() {
    super({
      code: 'USER_NOT_FOUND',
      message: 'User not found',
      status: HttpStatus.NOT_FOUND,
    });
  }
}
