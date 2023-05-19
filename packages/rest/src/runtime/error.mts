import {HttpRequest, HttpResponse} from './http-event.mjs';
import {Result} from "@nornir/core";

/**
 * Base error type for exceptions in rest handlers.
 * Can be directly converted into a HTTP response.
 */
export abstract class NornirRestError extends Error implements NodeJS.ErrnoException {
  public abstract toHttpResponse(): HttpResponse;
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
export interface NodeJSErrorMapping<T extends NodeJS.ErrnoException> {
  errorClass: new (...args: any[]) => T;
  toHttpResponse: (this: T) => HttpResponse;
}

export interface SerializableErrorMapping<T extends NornirRestError> {
  errorClass: new (...args: any[]) => T;
  toHttpResponse?: (this: T) => HttpResponse;
}

export type ErrorMappingSet = (NodeJSErrorMapping<never> | SerializableErrorMapping<never>)[];

export function handleHttpErrors(errorMappings?: ErrorMappingSet): (input: Result<HttpResponse>) => HttpResponse {
  const defaultedErrorMappings = [...errorMappings || [], {errorClass: NornirRestError, toHttpResponse: undefined}];

  return (input: Result<HttpResponse>) => {
    if (input.isErr) {
      const error = input.error;
      const mapping = defaultedErrorMappings.find(mapping => error instanceof mapping.errorClass);
      const responseConverter = mapping?.toHttpResponse || (error as NornirRestError).toHttpResponse
      if (responseConverter != undefined) {
        return responseConverter.call(error as never)
      }
    }
    return input.unwrap();
  }
}
