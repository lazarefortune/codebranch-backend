import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { nanoid } from 'nanoid';

export interface RequestWithId extends Request {
  id: string;
}

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: RequestWithId, res: Response, next: NextFunction) {
    req.id = `req_${nanoid(12)}`;
    res.setHeader('X-Request-Id', req.id);
    next();
  }
}
