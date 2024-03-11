import nornir from "@nornir/core";
import { ApiGatewayProxyV2, openAPIChain, OpenAPIRouter, OpenAPIV3_1, startLocalServer } from "@nornir/rest";
import type { APIGatewayProxyEventV2, APIGatewayProxyHandlerV2 } from "aws-lambda";

const Spec = {
  info: {
    title: "Test API",
    version: "1.0.0",
  },
  openapi: "3.1.0",
  components: {
    schemas: {
      "cool": {
        type: "object",
        properties: {
          cool: {
            type: "string",
          },
        },
      },
      "csv": {
        type: "string",
        pattern: "^[a-zA-Z0-9,]+$",
      },
    },
  },
  paths: {
    "/cool/test": {
      post: {
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/cool",
              },
            },
            "text/csv": {
              schema: {
                $ref: "#/components/schemas/csv",
              },
            },
          },
        },
        responses: {
          "200": {
            description: "cool",
          },
          "400": {
            description: "bad",
            headers: {
              "x-foo": {
                schema: {
                  type: "string",
                },
                required: true,
              },
            },
          },
        },
      },
    },
  },
} as const satisfies OpenAPIV3_1.Document;

const router = OpenAPIRouter.fromSpec(Spec);

router.implementRoute("/cool/test", "post", chain =>
  chain.use(req => {
    if (req.contentType === "text/csv") {
      console.log(req.body.toUpperCase());
    } else if (req.contentType === "application/json") {
      console.log(req.body.cool);
    }
    return {
      contentType: "application/json",
      statusCode: "400",
      headers: {
        "x-foo": "bar",
      },
    } as const;
  }));

export const handler: APIGatewayProxyHandlerV2 = nornir<APIGatewayProxyEventV2>()
  .use(ApiGatewayProxyV2.toHttpEvent)
  .useChain(openAPIChain(router))
  .use(ApiGatewayProxyV2.toResult)
  .build();

startLocalServer(openAPIChain(router));
