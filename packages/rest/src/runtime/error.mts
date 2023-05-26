import {HttpRequest, HttpResponse} from './http-event.mjs';
import {Result} from "@nornir/core";

/**
 * Base error type for exceptions in rest handlers.
 * Can be directly converted into a HTTP response.
 */
export abstract class NornirRestError extends Error implements NodeJS.ErrnoException {
    public abstract toHttpResponse(): HttpResponse;

    public static isNornirRestError(err: any): err is NornirRestError {
        return "toHttpResponse" in err;
    }
}

/**
 * Error type for exceptions that require information about the request.
 */
export abstract class NornirRestRequestError<Request extends HttpRequest> extends NornirRestError {
    constructor(
        public readonly request: Request,
        message: string
    ) {
        super(message);
    }

    abstract toHttpResponse(): HttpResponse;
}

interface ErrorMapping {
    errorMatch(error: unknown): boolean;
    toHttpResponse(error: unknown): HttpResponse;
}

export function mapErrorClass<T extends NodeJS.ErrnoException, TClass extends new (...args: any) => T>(error: TClass, toHttpResponse: (err: T) => HttpResponse): ErrorMapping;
export function mapErrorClass<T extends Error, TClass extends new (...args: any) => T>(error: TClass, toHttpResponse: (err: T) => HttpResponse): ErrorMapping {
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

export function httpErrorHandler(errorMappings?: ErrorMapping[]): (input: Result<HttpResponse>) => HttpResponse {
    const defaultedErrorMappings = errorMappings || [];

    return (input: Result<HttpResponse>) => {
        if (input.isErr) {
            const error = input.error;
            const mapping = defaultedErrorMappings.find(mapping => mapping.errorMatch(error));
            const responseConverter = mapping?.toHttpResponse
            if (responseConverter != undefined) {
                return responseConverter(error);
            }
            if (NornirRestError.isNornirRestError(error)) {
                return error.toHttpResponse();
            }
        }
        return input.unwrap();
    }
}
