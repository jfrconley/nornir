import {HttpRequest, HttpResponse, HttpStatusCode, MimeType} from './http-event.mjs';
import type {AttachmentRegistry, Result} from "@nornir/core";
import type {ErrorObject} from "ajv";

/**
 * Base error type for exceptions in rest handlers.
 * Can be directly converted into a HTTP response.
 */
export abstract class NornirRestError extends Error implements NodeJS.ErrnoException {
    public abstract toHttpResponse(registry: AttachmentRegistry): HttpResponse | Promise<HttpResponse>;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public static isNornirRestError(err: any): err is NornirRestError {
        return "toHttpResponse" in err;
    }
}

/**
 * Error type for exceptions that require information about the request.
 */
export abstract class NornirRestRequestError<Request extends HttpRequest = HttpRequest> extends NornirRestError {
    constructor(
        public readonly request: Request,
        message: string
    ) {
        super(message);
    }

    abstract toHttpResponse(registry: AttachmentRegistry): HttpResponse | Promise<HttpResponse>;
}


interface ErrorMapping {
    errorMatch(error: unknown): boolean;
    toHttpResponse(error: unknown, registry: AttachmentRegistry): HttpResponse | Promise<HttpResponse>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapErrorClass<T extends NodeJS.ErrnoException, TClass extends new (...args: any) => T>(error: TClass, toHttpResponse: (err: T, registry: AttachmentRegistry) => HttpResponse | Promise<HttpResponse>): ErrorMapping;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapErrorClass<T extends Error, TClass extends new (...args: any) => T>(error: TClass, toHttpResponse: (err: T, registry: AttachmentRegistry) => HttpResponse | Promise<HttpResponse>): ErrorMapping {
    return {
        errorMatch: (err: unknown): err is T => err instanceof error,
        toHttpResponse
    }
}

export function mapError<T>(errorMatch: (err: unknown) => err is T, toHttpResponse: (err: T) => HttpResponse): ErrorMapping {
    return {
        errorMatch,
        toHttpResponse
    }
}

export function httpErrorHandler(errorMappings?: ErrorMapping[]): (input: Result<HttpResponse>, registry: AttachmentRegistry) => Promise<HttpResponse> {
    const defaultedErrorMappings = errorMappings || [];

    return async (input: Result<HttpResponse>, registry: AttachmentRegistry) => {
        if (input.isErr) {
            const error = input.error;
            const mapping = defaultedErrorMappings.find(mapping => mapping.errorMatch(error));
            const responseConverter = mapping?.toHttpResponse
            if (responseConverter != undefined) {
                return responseConverter(error, registry);
            }
            if (NornirRestError.isNornirRestError(error)) {
                return error.toHttpResponse(registry);
            }
        }
        return input.unwrap();
    }
}

export class NornirRouteNotFoundError extends NornirRestRequestError<HttpRequest> {
    constructor(
        request: HttpRequest,
    ) {
        super(request, `Route not found`)
    }

    toHttpResponse(): HttpResponse {
        return {
            statusCode: HttpStatusCode.NotFound,
            body: "Not Found",
            headers: {
                "content-type": MimeType.TextPlain
            },
        }
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
                'content-type': MimeType.ApplicationJson
            },
        }
    }
}
