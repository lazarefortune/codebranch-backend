import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { randomBytes } from 'node:crypto';

export interface RequestWithId extends Request {
  id: string;
}

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: RequestWithId, res: Response, next: NextFunction) {
    req.id = `req_${randomBytes(9).toString('base64url')}`;
    res.setHeader('X-Request-Id', req.id);
    next();
  }
}
