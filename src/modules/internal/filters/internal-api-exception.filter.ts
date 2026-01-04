import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';

@Catch()
export class InternalApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const request_id = `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_SERVER_ERROR';
    let error: any = 'Internal server error';
    let details: any = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse() as any;

      if (status === HttpStatus.UNAUTHORIZED) code = 'UNAUTHORIZED';
      else if (status === HttpStatus.BAD_REQUEST) code = 'BAD_REQUEST';
      else if (status === HttpStatus.NOT_FOUND) code = 'NOT_FOUND';
      else if (status === HttpStatus.FORBIDDEN) code = 'FORBIDDEN';
      else if (status === HttpStatus.TOO_MANY_REQUESTS) code = 'TOO_MANY_REQUESTS';
      else code = 'HTTP_EXCEPTION';

      if (typeof res === 'string') {
        error = res;
      } else if (res && typeof res === 'object') {
        if (res.message !== undefined) {
          error = res.message;
        } else if (res.error !== undefined) {
          error = res.error;
        } else {
          error = exception.message;
        }

        if (res.message && Array.isArray(res.message)) {
          details = res.message;
          error = 'Validation failed';
        }
      } else {
        error = exception.message;
      }
    }

    response.status(status).json({
      error,
      code,
      status,
      request_id,
      path: request?.url,
      timestamp: new Date().toISOString(),
      details,
    });
  }
}
