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

    let errorMessage = 'Internal server error';
    let errorCode = 'INTERNAL_ERROR';

    if (typeof exceptionResponse === 'string') {
      errorMessage = exceptionResponse;
    } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const resp = exceptionResponse as any;
      if (resp.error && typeof resp.error === 'object') {
        errorCode = resp.error.code || 'INTERNAL_ERROR';
        errorMessage = resp.error.message || resp.message || 'Internal server error';
      } else {
        errorCode = resp.error || (status === 409 ? 'USER_ALREADY_EXISTS' : 'INTERNAL_ERROR');
        errorMessage = resp.message || 'Internal server error';
      }
    }

    const formattedCode =
      typeof errorCode === 'string'
        ? errorCode.toUpperCase().replace(/\s+/g, '_')
        : 'INTERNAL_ERROR';

    response.status(status).json({
      error: {
        code: formattedCode,
        message: Array.isArray(errorMessage)
          ? errorMessage.join('; ')
          : errorMessage,
      },
      request_id: crypto.randomUUID(),
    });
  }
}
