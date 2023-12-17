import nornir from "@nornir/core";
import {
  ApiGatewayProxyV2,
  httpErrorHandler,
  httpEventParser,
  httpResponseSerializer,
  HttpStatusCode,
  mapErrorClass,
  normalizeEventHeaders,
  router,
  startLocalServer,
  UnparsedHttpEvent,
} from "@nornir/rest";
import type {
  APIGatewayEventRequestContextV2,
  APIGatewayProxyEventV2,
  APIGatewayProxyHandlerV2,
  APIGatewayProxyStructuredResultV2,
} from "aws-lambda";
import "./controller.js";
import "./controller2.js";
import "./docs-controller.js";
import { getMockObject } from "@nrfcloud/ts-json-schema-transformer";

export class TestError implements NodeJS.ErrnoException {
  public readonly name = "TestError";
  constructor(
    public readonly message: string,
  ) {}
}

const frameworkChain = nornir<UnparsedHttpEvent>()
  .use(normalizeEventHeaders)
  .use(httpEventParser({
    "text/csv": _body => ({ cool: "stuff" }),
  }))
  .use(router())
  .useResult(httpErrorHandler([
    mapErrorClass(TestError, (_err) => ({
      statusCode: HttpStatusCode.BadRequest,
      headers: {},
    })),
  ]))
  .use(httpResponseSerializer({
    ["application/bzip"]: () => Buffer.from(""),
    ["text/csv"]: (input) => Buffer.from(input as string),
    ["text/html"]: (input) => Buffer.from(input as string),
  }));

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
  {} as never,
  console.log,
) as APIGatewayProxyStructuredResultV2;

console.log(testResponse);
if (testResponse.isBase64Encoded) {
  console.log(Buffer.from(testResponse.body || "", "base64").toString("utf8"));
}

await startLocalServer(frameworkChain);
console.log("Server started");
