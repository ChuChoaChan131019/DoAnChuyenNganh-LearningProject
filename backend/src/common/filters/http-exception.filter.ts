import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException
        ? exception.getResponse()
        : { message: 'Internal server error' };

    const errorMessage =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : (exceptionResponse as any).message || 'Internal server error';

    const errorCode =
      typeof exceptionResponse === 'object'
        ? (exceptionResponse as any).error || 'INTERNAL_ERROR'
        : 'INTERNAL_ERROR';

    response.status(status).json({
      error: {
        code: errorCode.toUpperCase().replace(/\s+/g, '_'),
        message: Array.isArray(errorMessage)
          ? errorMessage.join('; ')
          : errorMessage,
      },
      request_id: crypto.randomUUID(),
    });
  }
}
