// import { Nornir } from "@nornir/core";
// import {
//   Controller,
//   GetChain,
//   HttpRequest,
//   HttpRequestEmpty,
//   HttpResponse,
//   HttpResponseEmpty,
//   Provider,
//   PutChain,
// } from "@nornir/rest";
//
// interface RouteGetInput extends HttpRequestEmpty {
// }
//
// interface RoutePostInputJSON extends HttpRequest {
//   headers: {
//     "content-type": "application/json";
//   };
//   body: RoutePostBodyInput;
// }
//
// interface RoutePostInputCSV extends HttpRequest {
//   headers: {
//     "content-type": "text/csv";
//   };
//   body: string;
// }
//
// type RoutePutInput = RoutePostInputJSON | RoutePostInputCSV;
//
// interface RoutePostBodyInput {
//   cool: string;
// }
//
// const basePath = "/basepath/2";
//
// /**
//  * This is a second controller
//  * @summary This is a summary
//  */
// @Controller(basePath, "test")
// export class TestController {
//   @Provider()
//   public static test() {
//     return new TestController();
//   }
//
//   /**
//    * The second simple GET route.
//    * @summary Get route
//    */
//   @GetChain("/route")
//   public getRoute(chain: Nornir<RouteGetInput>) {
//     return chain
//       .use(contentType => ({
//         statusCode: "200",
//         body: `Content-Type: ${contentType}`,
//         headers: {
//           "content-type": "text/plain",
//         },
//       } as const));
//   }
//
//   /**
//    * The second simple PUT route.
//    * @summary Put route
//    */
//   @PutChain("/route")
//   public postRoute(chain: Nornir<RoutePutInput>): Nornir<RoutePutInput, PutResponse> {
//     return chain
//       .use(() => ({
//         statusCode: "201",
//         headers: {},
//       }));
//   }
// }
//
// type PutResponse = PutSuccessResponse | PutBadRequestResponse;
//
// interface PutSuccessResponse extends HttpResponseEmpty {
//   statusCode: "201";
// }
//
// interface PutBadRequestResponse extends HttpResponse {
//   statusCode: "422";
//   headers: {
//     "content-type": "application/json";
//   };
//   body: {
//     potato: boolean;
//   };
// }
