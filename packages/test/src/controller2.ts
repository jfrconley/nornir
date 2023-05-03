import { Nornir } from "@nornir/core";
import {
  Controller,
  GetChain,
  HttpRequest,
  HttpRequestEmpty,
  HttpResponse,
  HttpResponseEmpty,
  HttpStatusCode,
  PutChain,
} from "@nornir/rest";

interface RouteGetInput extends HttpRequestEmpty {
  headers: GetHeaders;
}
interface GetHeaders {
  // eslint-disable-next-line sonarjs/no-duplicate-string
  "content-type": "text/plain";
  [key: string]: string;
}

interface RoutePostInputJSON extends HttpRequest {
  headers: {
    "content-type": "application/json";
  };
  body: RoutePostBodyInput;
}

interface RoutePostInputCSV extends HttpRequest {
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
export class TestController {
  /**
   * The second simple GET route.
   * @summary Get route
   */
  @GetChain("/route")
  public getRoute(chain: Nornir<RouteGetInput>) {
    return chain
      .use(input => input.headers["content-type"])
      .use(contentType => ({
        statusCode: HttpStatusCode.Ok,
        body: `Content-Type: ${contentType}`,
        headers: {
          "content-type": "text/plain" as const,
        },
      }));
  }

  @PutChain("/route")
  public postRoute(chain: Nornir<RoutePutInput>): Nornir<RoutePutInput, PutResponse> {
    return chain
      .use(() => ({
        statusCode: HttpStatusCode.Created,
        headers: {},
      }));
  }
}

type PutResponse = PutSuccessResponse | PutBadRequestResponse;

interface PutSuccessResponse extends HttpResponseEmpty {
  statusCode: HttpStatusCode.Created;
}

interface PutBadRequestResponse extends HttpResponse {
  statusCode: HttpStatusCode.BadRequest;
  headers: {
    "content-type": "application/json";
  };
  body: {
    potato: boolean;
  };
}
