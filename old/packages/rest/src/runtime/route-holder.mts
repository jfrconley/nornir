import { HttpMethod, IHttpRequest, IHttpResponse } from './http-event.mjs';
import { Nornir } from '@nornir/core';
import { NornirRestRequestError } from './error.mjs';
import {type ErrorObject, type ValidateFunction, type ValidationError} from 'ajv'

export type RouteBuilder<Input extends IHttpRequest = IHttpRequest, Output extends IHttpResponse = IHttpResponse> = (chain: Nornir<Input>) => Nornir<Input, Output>


/**
 * @internal
 */
export class RouteHolder {
  public readonly routes: { method: HttpMethod, path: string, builder: RouteBuilder }[] = []

  constructor(
    private readonly basePath: string
  ) {
  }

  public route<Input extends IHttpRequest = IHttpRequest, Output extends IHttpResponse = IHttpResponse>
  (method: HttpMethod, path: string, builder: RouteBuilder<Input, Output>, validator: ValidateFunction<Input>) {
    const handler = builder(new Nornir<Input>());
    this.routes.push({
      method,
      path: this.basePath + path,
      builder: chain =>
        chain.use(request => {
          const result = validator(request)
          if (!result) {
            throw new NornirRestRequestValidationError(request, validator.errors || [])
          }
          return request as Input;
        })
          .useChain(handler)
    })
  }
}

export class NornirRestRequestValidationError<Request extends IHttpRequest> extends NornirRestRequestError<Request> {
  constructor(
    request: Request,
    public readonly errors: ErrorObject[]
  ) {
    super(request, `Request validation failed`)
  }
}
