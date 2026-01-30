import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { nanoid } from 'nanoid';

interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Array<{ field: string; message: string }>;
    requestId: string;
  };
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const requestId = `req_${nanoid(12)}`;

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred';
    let details: Array<{ field: string; message: string }> | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseObj = exceptionResponse as Record<string, unknown>;
        code = (responseObj.code as string) || this.getCodeFromStatus(status);
        message = (responseObj.message as string) || exception.message;

        if (Array.isArray(responseObj.message)) {
          details = responseObj.message.map((msg: string) => ({
            field: this.extractFieldFromMessage(msg),
            message: msg,
          }));
          message = 'Validation failed';
          code = 'VALIDATION_ERROR';
        }

        if (responseObj.details) {
          details = responseObj.details as Array<{
            field: string;
            message: string;
          }>;
        }
      } else {
        message = exceptionResponse as string;
        code = this.getCodeFromStatus(status);
      }
    }

    // Log error for debugging
    console.error(`[${requestId}] ${request.method} ${request.url}`, {
      status,
      code,
      message,
      stack: exception instanceof Error ? exception.stack : undefined,
    });

    const errorResponse: ErrorResponse = {
      error: {
        code,
        message,
        requestId,
      },
    };

    if (details) {
      errorResponse.error.details = details;
    }

    response.status(status).json(errorResponse);
  }

  private getCodeFromStatus(status: number): string {
    const statusCodes: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'UNPROCESSABLE_ENTITY',
      429: 'RATE_LIMITED',
      500: 'INTERNAL_ERROR',
    };
    return statusCodes[status] || 'UNKNOWN_ERROR';
  }

  private extractFieldFromMessage(message: string): string {
    const patterns = [
      /^([a-zA-Z]+) must/i,
      /^([a-zA-Z]+) should/i,
      /^([a-zA-Z]+) is /i,
      /^Please provide a valid ([a-zA-Z]+)/i,
      /^Invalid ([a-zA-Z]+)/i,
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        return match[1].toLowerCase();
      }
    }

    // Fallback: try to find common field names in the message
    const commonFields = ['email', 'password', 'username', 'name', 'title'];
    const lowerMessage = message.toLowerCase();
    for (const field of commonFields) {
      if (lowerMessage.includes(field)) {
        return field;
      }
    }

    return 'field';
  }
}
