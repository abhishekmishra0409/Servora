import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { from, Observable, of } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { Model } from 'mongoose';

import { IdempotencyKey } from '../../database/schemas/idempotency-key.schema';

type IdempotentRequest = {
  headers: Record<string, string | string[] | undefined>;
  method: string;
  originalUrl: string;
  route?: { path?: string };
  user?: { tenantId?: string };
};

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(
    @InjectModel(IdempotencyKey.name)
    private readonly idempotencyModel: Model<IdempotencyKey>,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest<IdempotentRequest>();
    const response = context.switchToHttp().getResponse<{ statusCode: number }>();
    const key = request.headers['idempotency-key'];

    if (!key || Array.isArray(key)) {
      throw new BadRequestException('Idempotency-Key header is required');
    }

    const tenantId = request.user?.tenantId ?? 'platform';
    const route = `${request.method}:${request.route?.path ?? request.originalUrl}`;
    const existing = await this.idempotencyModel.findOne({ key, route, tenantId }).lean().exec();

    if (existing) {
      return of(existing.responseBody);
    }

    return next.handle().pipe(
      mergeMap((body) =>
        from(
          this.idempotencyModel
            .findOneAndUpdate(
              { key, route, tenantId },
              {
                $set: {
                  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
                  responseBody: body,
                  statusCode: response.statusCode,
                },
              },
              { upsert: true, returnDocument: 'after' },
            )
            .then(() => body),
        ),
      ),
    );
  }
}
