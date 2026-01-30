import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { nanoid } from 'nanoid';

interface ValidationDetail {
  field: string;
  message: string;
}

interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: ValidationDetail[];
    requestId: string;
  };
}

interface ParsedError {
  status: number;
  code: string;
  message: string;
  details?: ValidationDetail[];
}

const STATUS_CODE_MAP: Record<number, string> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'UNPROCESSABLE_ENTITY',
  429: 'RATE_LIMITED',
  500: 'INTERNAL_ERROR',
};

const FIELD_PATTERNS = [
  /^([a-zA-Z]+) must/i,
  /^([a-zA-Z]+) should/i,
  /^([a-zA-Z]+) is /i,
  /^Please provide a valid ([a-zA-Z]+)/i,
  /^Invalid ([a-zA-Z]+)/i,
];

const COMMON_FIELDS = ['email', 'password', 'username', 'name', 'title', 'code', 'token'];

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId = `req_${nanoid(12)}`;

    const { status, code, message, details } = this.parseException(exception);

    this.logError(requestId, request, { status, code, message }, exception);

    const errorResponse: ErrorResponse = {
      error: { code, message, requestId, ...(details && { details }) },
    };

    response.status(status).json(errorResponse);
  }

  private parseException(exception: unknown): ParsedError {
    if (!(exception instanceof HttpException)) {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      };
    }

    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    if (typeof exceptionResponse !== 'object' || exceptionResponse === null) {
      return {
        status,
        code: STATUS_CODE_MAP[status] ?? 'UNKNOWN_ERROR',
        message: String(exceptionResponse),
      };
    }

    const responseObj = exceptionResponse as Record<string, unknown>;

    // Handle validation errors (array of messages from class-validator)
    if (Array.isArray(responseObj.message)) {
      return {
        status,
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: responseObj.message.map((msg: string) => ({
          field: this.extractField(msg),
          message: msg,
        })),
      };
    }

    return {
      status,
      code: (responseObj.code as string) ?? STATUS_CODE_MAP[status] ?? 'UNKNOWN_ERROR',
      message: (responseObj.message as string) ?? exception.message,
      details: responseObj.details as ValidationDetail[] | undefined,
    };
  }

  private extractField(message: string): string {
    // Try regex patterns first
    for (const pattern of FIELD_PATTERNS) {
      const match = message.match(pattern);
      if (match) return match[1].toLowerCase();
    }

    // Fallback: check for common field names
    const lowerMessage = message.toLowerCase();
    return COMMON_FIELDS.find((field) => lowerMessage.includes(field)) ?? 'field';
  }

  private logError(
    requestId: string,
    request: Request,
    error: Pick<ParsedError, 'status' | 'code' | 'message'>,
    exception: unknown,
  ) {
    console.error(`[${requestId}] ${request.method} ${request.url}`, {
      ...error,
      stack: exception instanceof Error ? exception.stack : undefined,
    });
  }
}
