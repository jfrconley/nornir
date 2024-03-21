import nornir from "@nornir/core";
import { ApiGatewayProxyV2, openAPIChain, OpenAPIRouter, OpenAPIV3_1, startLocalServer } from "@nornir/rest";
import type { APIGatewayProxyEventV2, APIGatewayProxyHandlerV2 } from "aws-lambda";
import Spec from "./openapi-spec.js";

export const router: OpenAPIRouter<typeof Spec> = OpenAPIRouter.fromSpec(Spec);

// router.implementRoute("/cool/test", "post", chain =>
//   chain.use(req => {
//     if (req.contentType === "text/csv") {
//       console.log(req.body.toUpperCase());
//     } else if (req.contentType === "application/json") {
//       console.log(req.body.cool);
//     }
//     return {
//       contentType: "application/json",
//       statusCode: "400",
//       headers: {
//         "x-foo": "bar",
//       },
//     } as const;
//   }));

router.implementRoute("/destination", "post", chain =>
  chain.use(req => {
    return {
      contentType: "application/json",
      statusCode: "201",
      headers: {},
      body: {
        errors: [],
        createdAt: new Date().toISOString(),
        isEnabled: true,
        name: "test",
        id: "123",
        type: "destination",
        config: {
          type: "http",
          verifySsl: true,
          url: "https://example.com",
        },
      },
    };
  }));

export const handler: APIGatewayProxyHandlerV2 = nornir<APIGatewayProxyEventV2>()
  .use(ApiGatewayProxyV2.toHttpEvent)
  .useChain(openAPIChain(router))
  .use(ApiGatewayProxyV2.toResult)
  .build();

startLocalServer(openAPIChain(router));
