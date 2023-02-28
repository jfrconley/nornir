import { Nornir } from "@nornir/core";
import { GetChain, IHttpRequest, IHttpResponse, Controller, PostChain, IHttpRequestEmpty } from "@nornir/rest";

interface RouteGetInput extends IHttpRequestEmpty {
  headers: {
    "content-type": "text/plain";
  };
}

interface RoutePostInputJSON extends IHttpRequest {
  headers: {
    "content-type": "application/json";
  },
  body: RoutePostBodyInput
}
interface RoutePostInputHeadersOther {
  "content-type": "text/plain";
}
interface RoutePostInputCSV extends IHttpRequest {
  headers: {
    "content-type": "text/csv";
  }
  body: string;
}

type RoutePostInput = RoutePostInputJSON | RoutePostInputCSV;

interface RoutePostBodyInput {
  cool: string;
}

const basePath = "/basepath";
@Controller(basePath)
class TestController {
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
  @PostChain("/route")
  public postRoute(chain: Nornir<RoutePostInput>) {
    return chain
      .use(input => {
        // switch (input.headers["content-type"]) {
        //   case "application/json":
        //     console.log(`JSON: ${JSON.stringify(input.body)}`);
        //     break;
        //   case 'text/csv':
        //     console.log(`CSV: ${input.body}`);
        //     break;
        // }
      })
      .use(contentType => ({
        statusCode: 200,
        body: `Content-Type: ${contentType}`,
        headers: {},
      }));
  }
}

// @Controller(basePath)
// class OtherController {
//   @GetChain("/route")
//   public getRoute(chain: Nornir<RouteGetInput>): Nornir<RouteGetInput, IHttpResponse> {
//     return chain
//       .use(input => input.headers["content-type"])
//       .use(contentType => ({
//         statusCode: 200,
//         body: `Content-Type: ${contentType}`,
//         headers: {},
//       }));
//   }
//
//   @PostChain("/route")
//   public postRoute(chain: Nornir<RoutePostInput>): Nornir<RoutePostInput, IHttpResponse> {
//     return chain
//       .use(input => input.headers["content-type"])
//       .use(contentType => ({
//         statusCode: 200,
//         body: `Content-Type: ${contentType}`,
//         headers: {},
//       }));
//   }
// }


