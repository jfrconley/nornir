import { HttpMethod, IHttpRequest, IHttpResponse } from './http-event.mjs';
import { Nornir } from '@nornir/core';
import { NornirRestRequestError } from './error.mjs';
import { validate, IValidation } from 'typia'


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
  (method: HttpMethod, path: string, builder: RouteBuilder<Input, Output>, validator: (input: IHttpRequest) => IValidation<Input>) {
    const handler = builder(new Nornir<Input>());
    this.routes.push({
      method,
      path: this.basePath + path,
      builder: chain =>
        chain.use(request => {
          const result = validator(request)
          if (!result.success) {
            throw new NornirRestRequestValidationError(request, result.errors)
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
    public readonly errors: IValidation.IError[]
  ) {
    super(request, `Request validation failed`)
  }
}
