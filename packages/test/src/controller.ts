import { Nornir } from "@nornir/core";
import { GetChain, IHttpRequest, IHttpResponse, Route } from "@nornir/rest";
import { router } from "./rest.js";

interface RouteGetInput extends IHttpRequest {
  headers: {
    "content-type": "text/plain";
  };
}

const basePath = "/basepath";

@Route(router, basePath)
export class Controller {
  @GetChain("/route")
  public getRoute(chain: Nornir<RouteGetInput>): Nornir<RouteGetInput, IHttpResponse> {
    return chain
      .use(input => input.headers["content-type"])
      .use(contentType => ({
        statusCode: 200,
        body: `Content-Type: ${contentType}`,
        headers: {},
      }));
  }
}
