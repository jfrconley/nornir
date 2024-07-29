import {HttpMethod, HttpRequest, HttpResponse} from '../shared/http-event.mjs';
import {Nornir} from '@nornir/core';
import {NornirRestRequestValidationError} from '../shared/error.mjs';
import {type ValidateFunction} from 'ajv'

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
                        throw new NornirRestRequestValidationError(request, validator.errors || [])
                    }
                    return request as Input;
                })
                    .useChain(handler)
        })
    }
}
