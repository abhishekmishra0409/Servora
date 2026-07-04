import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const error =
      exception instanceof HttpException
        ? exception.getResponse()
        : { message: 'Internal server error' };

    // Log unexpected (non-HttpException) errors with their stack — previously
    // these vanished, leaving 500s undiagnosable. Also surface real 5xx from
    // HttpExceptions. Client-facing 4xx are left unlogged to avoid noise.
    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      const stack = exception instanceof Error ? exception.stack : undefined;
      const message = exception instanceof Error ? exception.message : String(exception);
      this.logger.error(`${request.method} ${request.url} -> ${status}: ${message}`, stack);
    }

    response.status(status).json({
      error,
      path: request.url,
      statusCode: status,
      timestamp: new Date().toISOString(),
    });
  }
}
