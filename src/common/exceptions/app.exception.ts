import { HttpException } from '@nestjs/common';

export interface ErrorDetail {
  field: string;
  message: string;
}

export class AppException extends HttpException {
  constructor(
    status: number,
    code: string,
    message: string,
    details?: ErrorDetail[],
  ) {
    super({ code, message, details }, status);
  }
}
