import { HttpException, HttpStatus } from '@nestjs/common';

export interface CustomExceptionOptions {
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
