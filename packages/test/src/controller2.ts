// import { Nornir } from "@nornir/core";
// import {
//   AnyMimeType,
//   Controller,
//   GetChain,
//   HttpRequest,
//   HttpRequestEmpty,
//   HttpResponse,
//   HttpResponseEmpty,
//   HttpStatusCode,
//   MimeType,
//   Provider,
//   PutChain,
// } from "@nornir/rest";
//
// interface RouteGetInput extends HttpRequestEmpty {
//   headers: GetHeaders;
// }
// interface GetHeaders {
//   "content-type": AnyMimeType;
//   [key: string]: string;
// }
//
// interface RoutePostInputJSON extends HttpRequest {
//   headers: {
//     "content-type": MimeType.ApplicationJson;
//   };
//   body: RoutePostBodyInput;
// }
//
// interface RoutePostInputCSV extends HttpRequest {
//   headers: {
//     "content-type": MimeType.TextCsv;
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
//       .use(input => input.headers["content-type"])
//       .use(contentType => ({
//         statusCode: HttpStatusCode.Ok,
//         body: `Content-Type: ${contentType}`,
//         headers: {
//           "content-type": MimeType.TextPlain,
//         },
//       }));
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
//         statusCode: HttpStatusCode.Created,
//         headers: {
//           "content-type": AnyMimeType,
//         },
//       }));
//   }
// }
//
// type PutResponse = PutSuccessResponse | PutBadRequestResponse;
//
// interface PutSuccessResponse extends HttpResponseEmpty {
//   statusCode: HttpStatusCode.Created;
// }
//
// interface PutBadRequestResponse extends HttpResponse {
//   statusCode: HttpStatusCode.BadRequest;
//   headers: {
//     "content-type": MimeType.ApplicationJson;
//   };
//   body: {
//     potato: boolean;
//   };
// }
