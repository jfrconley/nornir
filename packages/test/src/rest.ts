import nornir from "@nornir/core";
import framework, { ApiGatewayProxyV2, startLocalServer } from "@nornir/rest";
import type {
  APIGatewayEventRequestContextV2,
  APIGatewayProxyEventV2,
  APIGatewayProxyHandlerV2,
  APIGatewayProxyStructuredResultV2,
} from "aws-lambda";
import "./controller.js";
import "./controller2.js";
import { getMockObject } from "@nrfcloud/ts-json-schema-transformer";

const frameworkChain = framework();

export const handler: APIGatewayProxyHandlerV2 = nornir<APIGatewayProxyEventV2>()
  .use(ApiGatewayProxyV2.toHttpEvent)
  .useChain(frameworkChain)
  .use(ApiGatewayProxyV2.toResult)
  .build();

const mockEvent = getMockObject<Omit<APIGatewayProxyEventV2, "requestContext">>();
const mockContext = getMockObject<APIGatewayEventRequestContextV2>();

const testResponse = await handler(
  {
    ...mockEvent,
    body: JSON.stringify({
      cool: "stuff",
    }),
    isBase64Encoded: false,
    rawPath: "/basepath/2/route",
    headers: {
      "Content-Type": "application/json",
    },
    requestContext: {
      ...mockContext,
      http: {
        method: "PUT",
        path: "/basepath/2/route",
        protocol: "HTTP/1.1",
        sourceIp: "",
        userAgent: "",
      },
    },
  },
  {} as any,
  console.log,
) as APIGatewayProxyStructuredResultV2;

console.log(testResponse);
if (testResponse.isBase64Encoded) {
  console.log(Buffer.from(testResponse.body || "", "base64").toString("utf8"));
}

await startLocalServer(frameworkChain);
console.log("Server started");
