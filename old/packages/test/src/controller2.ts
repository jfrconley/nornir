import { Nornir } from "@nornir/core";
import {
  Controller,
  GetChain,
  IHttpRequest,
  IHttpRequestEmpty,
  IHttpResponse,
  IHttpResponseEmpty,
  PostChain,
  PutChain,
} from "@nornir/rest";

interface RouteGetInput extends IHttpRequestEmpty {
  headers: GetHeaders;
}
interface GetHeaders {
  "content-type": "text/plain";
  [key: string]: string;
}

interface RoutePostInputJSON extends IHttpRequest {
  headers: {
    "content-type": "application/json";
  };
  body: RoutePostBodyInput;
}

interface RoutePostInputHeadersOther {
  "content-type": "text/plain";
}

interface RoutePostInputCSV extends IHttpRequest {
  headers: {
    "content-type": "text/csv";
  };
  body: string;
}

type RoutePutInput = RoutePostInputJSON | RoutePostInputCSV;

interface RoutePostBodyInput {
  cool: string;
}

const basePath = "/basepath/2";
@Controller(basePath)
class TestController {
  /**
   * The second simple GET route.
   * @summary Get route
   */
  @GetChain("/route")
  public getRoute(chain: Nornir<RouteGetInput>) {
    return chain
      .use(input => input.headers["content-type"])
      .use(contentType => ({
        statusCode: "200" as const,
        body: `Content-Type: ${contentType}`,
        headers: {
          "content-type": "text/plain" as const,
        },
      }));
  }

  @PutChain("/route")
  public postRoute(chain: Nornir<RoutePutInput>): Nornir<RoutePutInput, PutResponse> {
    return chain
      .use(contentType => ({
        statusCode: "201" as const,
        headers: {},
      }));
  }
}

type PutResponse = PutSuccessResponse | PutBadRequestResponse;

interface PutSuccessResponse extends IHttpResponseEmpty {
  statusCode: "201";
}

interface PutBadRequestResponse extends IHttpResponse {
  statusCode: "400";
  headers: {
    "content-type": "application/json";
  };
  body: {
    potato: boolean;
  };
}
