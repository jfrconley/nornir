import {HttpMethod, HttpRequest, HttpResponse, HttpStatusCode, MimeType} from './http-event.mjs';
import {Nornir} from '@nornir/core';
import {NornirRestRequestError} from './error.mjs';
import {type ErrorObject, type ValidateFunction} from 'ajv'

export type RouteBuilder<Input extends HttpRequest = HttpRequest, Output extends HttpResponse = HttpResponse> = (chain: Nornir<Input>) => Nornir<Input, Output>


/**
 * @internal
 */
export class RouteHolder {
    public readonly routes: { method: HttpMethod, path: string, builder: RouteBuilder }[] = []

    constructor(
        private readonly basePath: string
    ) {}

    public route<Input extends HttpRequest = HttpRequest, Output extends HttpResponse = HttpResponse>
    (method: HttpMethod, path: string, builder: RouteBuilder<Input, Output>, validator: ValidateFunction<Input>) {
        const handler = builder(new Nornir<Input>());
        this.routes.push({
            method,
            path: this.basePath + path,
            builder: chain =>
                chain.use(request => {
                    const result = validator(request)
                    if (!result) {
                        console.log(validator.errors)
                        throw new NornirRestRequestValidationError(request, validator.errors || [])
                    }
                    return request as Input;
                })
                    .useChain(handler)
        })
    }
}

/**
 * Error thrown when the request does not pass validation checks.
 * Includes information about the validation errors.
 */
export class NornirRestRequestValidationError<Request extends HttpRequest> extends NornirRestRequestError<Request> {
    constructor(
        request: Request,
        public readonly errors: ErrorObject[]
    ) {
        super(request, `Request validation failed`)
    }

    toHttpResponse(): HttpResponse {
        return {
            statusCode: HttpStatusCode.UnprocessableEntity,
            body: {errors: this.errors},
            headers: {
                'content-type': MimeType.ApplicationJson,
            },
        }
    }
}
