import { Nornir } from "@nornir/core";
import {
  Controller,
  GetChain,
  type HttpRequest,
  HttpRequestEmpty,
  HttpResponse,
  HttpStatusCode,
  MimeType,
  PostChain,
  ValidateRequestType,
  ValidateResponseType,
} from "@nornir/rest";
import { assertValid } from "@nrfcloud/ts-json-schema-transformer";

interface RouteGetInput extends HttpRequest {
  pathParams: {
    /**
     * @pattern ^[a-z]+$
     */
    cool: TestStringType;
  };
}

interface RoutePostInputJSON extends HttpRequest {
  headers: {
    "content-type": MimeType.ApplicationJson;
  } | { "content-type": MimeType.TextPlain };
  /**
   * A cool json input
   * @example { "cool": "stuff" }
   */
  body: RoutePostBodyInput;
  query: {
    test: "boolean";
  };
  pathParams: {
    /**
     * Very cool property that does a thing
     * @pattern ^[a-z]+$
     * @example "true"
     */
    reallyCool: "true" | "false";

    /**
     * Even cooler property
     */
    evenCooler?: number;
  };
}

interface RoutePostInputCSV extends HttpRequest {
  headers: {
    "content-type": MimeType.TextCsv;
    /**
     * This is a CSV header
     * @example "cool,cool2"
     * @pattern ^[a-z]+,[a-z]+$
     * @minLength 5
     */
    "csv-header": string;
  };
  /**
   * This is a CSV body
   * @example "cool,cool2"
   */
  body: TestStringType;
  pathParams: {
    /**
     * @deprecated
     */
    reallyCool: TestStringType;
  };
}

export type RoutePostInput = RoutePostInputCSV | RoutePostInputJSONAlias;

export type RoutePostInputJSONAlias = RoutePostInputJSON;

/**
 * This is a comment
 */
export interface RouteGetOutputSuccess extends HttpResponse {
  /**
   * This is a property
   */
  statusCode: HttpStatusCode.Ok | HttpStatusCode.Created;
  body: {
    bleep: string;
    bloop: number;
  };
  headers: {
    "content-type": MimeType.ApplicationJson;
  };
}

/**
 * This is a comment on RouteGetOutputError
 */
export interface RouteGetOutputError extends HttpResponse {
  statusCode: HttpStatusCode.BadRequest;
  // /**
  //  * @example { "message": "Bad Request"}
  //  */
  // body: {
  //   message: string;
  // };
  body: undefined;
  headers: {
    "content-type": MimeType.ApplicationJson;
  };
}

/**
 * Output of the GET route
 */
export type RouteGetOutput = RouteGetOutputSuccess | RouteGetOutputError;

/**
 * this is a comment
 */
interface RoutePostBodyInput {
  /**
   * This is a cool property
   * @minLength 5
   */
  cool: string;
}

/**
 * Amazing string
 * @pattern ^[a-z]+$
 * @minLength 5
 */
export type TestStringType = Nominal<string, "TestStringType">;

export declare class Tagged<N extends string> {
  protected _nominal_: N;
}

/**
 * Constructs a nominal type of type `T`.
 * Useful to prevent any value of type `T` from being used or modified in places it shouldn't (think `id`s).
 * @param T the type of the `Nominal` type (string, number, etc.)
 * @param N the name of the `Nominal` type (id, username, etc.)
 * @param E additional nominal types that can satisfy the `Nominal` type
 * @returns a type that is equal only to itself, but can be used like its contained type `T`
 */
export type Nominal<T, N extends string, E extends T & Tagged<string> = T & Tagged<N>> = (T & Tagged<N>) | E;

const overallBase = "/root";

const basePath = `${overallBase}/basepath`;

/**
 * This is a controller
 * @summary This is a summary
 */
@Controller(basePath)
export class TestController {
  /**
   * Cool get route
   */
  @GetChain("/route/:cool")
  public getRoute(chain: Nornir<RouteGetInput>): Nornir<RouteGetInput, RouteGetOutput> {
    return chain
      .use(input => {
        assertValid<RouteGetInput>(input);
        return input;
      })
      .use(input => input.headers?.toString())
      .use(_contentType => ({
        statusCode: "200" as const,
        body: {
          bleep: "bloop",
          bloop: 5,
        },
        headers: {
          "content-type": "application/json" as const,
        } as const,
      } as RouteGetOutput));
  }

  /**
   * A simple post route
   * @summary Cool Route
   * @tags cool
   * @deprecated
   * @operationId coolRoute
   */
  @PostChain("/route/:cool")
  public postRoute(
    chain: Nornir<RoutePostInput>,
  ): Nornir<RoutePostInput, { statusCode: HttpStatusCode.Ok; headers: NonNullable<unknown> }> {
    return chain
      .use(_contentType => ({
        statusCode: HttpStatusCode.Ok,
        // body: `Content-Type: ${contentType}`,
        headers: {},
        body: "",
      }));
  }
}
