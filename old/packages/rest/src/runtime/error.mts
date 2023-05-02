import { IHttpRequest } from './http-event.mjs';

export class NornirRestBaseError extends Error implements NodeJS.ErrnoException {}

export class NornirRestRequestError<Request extends IHttpRequest> extends NornirRestBaseError {
  constructor(
    public readonly request: Request,
    message: string
  ) {
    super(message);
  }
}
