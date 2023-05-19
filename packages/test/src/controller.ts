import { Nornir } from "@nornir/core";
import {
  Controller,
  GetChain,
  type HttpRequest,
  HttpRequestEmpty,
  HttpStatusCode,
  MimeType,
  PostChain,
} from "@nornir/rest";

interface RouteGetInput extends HttpRequestEmpty {
  headers: {
    // eslint-disable-next-line sonarjs/no-duplicate-string
    "content-type": MimeType.None;
  };
}

interface RoutePostInputJSON extends HttpRequest {
  headers: {
    // eslint-disable-next-line sonarjs/no-duplicate-string
    "content-type": MimeType.ApplicationJson;
  };
  body: RoutePostBodyInput;
  query: {
    test: "boolean";
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
  body: TestStringType;
}

type RoutePostInput = RoutePostInputJSON | RoutePostInputCSV;

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
type TestStringType = Nominal<string, "TestStringType">;

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

const basePath = "/basepath";

@Controller(basePath)
export class TestController {
  static {
    console.log("hello");
  }

  /**
   * A simple get route
   * @summary Cool Route
   */
  @GetChain("/route")
  public getRoute(chain: Nornir<RouteGetInput>) {
    return chain
      .use(input => input.headers["content-type"])
      .use(contentType => ({
        statusCode: HttpStatusCode.Ok,
        body: `Content-Type: ${contentType}`,
        headers: {
          "content-type": MimeType.TextPlain,
        },
      }));
  }
  @PostChain("/route")
  public postRoute(chain: Nornir<RoutePostInput>) {
    return chain
      .use(contentType => ({
        statusCode: HttpStatusCode.Ok,
        body: `Content-Type: ${contentType}`,
        headers: {
          "content-type": MimeType.TextPlain,
        },
      }));
  }
}
