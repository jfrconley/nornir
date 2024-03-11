# OpenAPI Spec Router

This is the API for the OpenAPI Spec based router.
It allows you to implement your handlers based on a typed OpenAPI schema.
It uses conditional typescript types to allow implementing type safe handlers that are guaranteed to match the OpenAPI schema.

## Basic Usage

**Declare your OpenAPI Spec as a constant types**

```typescript
import { OpenAPIV3_1 } from "@nornir/rest";

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
      "other": {
        type: "object",
        properties: {
          other: {
            type: "string",
          },
        },
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
                $ref: "#/components/schemas/other",
              },
            },
          },
        },
        responses: {
          "200": {
            description: "cool",
            headers: {
              "x-cool": {
                schema: {
                  type: "string",
                },
              },
            },
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/cool",
                },
              },
            },
          },
        },
      },
    },
  },
} as const satisfies OpenAPIV3_1.Document;
```

**Instantiate the router and implement your handlers**

```typescript
const router = OpenAPIRouter.fromSpec(Spec);

// This entire block is fully type safe
// You will get completions and type errors for all inputs and outputs
router.implementRoute("/cool/test", "post", chain =>
  chain.use(req => {
    req.body.other = "cool";
    return {
      contentType: "application/json",
      statusCode: "200",
      headers: {
        // "x-cool": "cool",
      },
      body: req.body,
    } as const;
  }));
```

**Add your router to a Nornir chain**

```typescript
export const handler: APIGatewayProxyHandlerV2 = nornir<
  APIGatewayProxyEventV2
>()
  .use(ApiGatewayProxyV2.toHttpEvent)
  .useChain(openAPIChain(router))
  .use(ApiGatewayProxyV2.toResult)
  .build();
```

And you're done! All input validation and route registration is done using automatically using the OpenAPI spec.

### Merging Routers

If you are implementing your API across multiple files, you can merge routers together using the `merge` method.

```typescript
const mergedRouter = OpenAPIRouter.merge(spec, router1, router2);
```

This guarantees that all routers implement parts of the same spec and merges them into one.

### Input Events

The framework functions by taking in an `UnparsedHttpRequest` and returning a `SerializedHttpResponse`.
You can create this event from any source, but the framework provides a few helpers to make this easier.

**Supported Converters**

- ApiGatewayProxyV2
  - Handles api gateway proxy events. Base64 encodes and decodes request and response bodies.

Additionally, a simple local server is provided for testing purposes.

### Handling requests

Request are handled by using the `implementRoute` method on the router.
This method takes a path, an HTTP method, and chain builder function.
All of these are type-checked against the OpenAPI spec.

```typescript
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
    // Type-narrowing is used to select body type based on content-type
    if (req.contentType === "text/csv") {
      console.log(req.body.toUpperCase());
    } else if (req.contentType === "application/json") {
      console.log(req.body.cool);
    }

    // Type-narrowing works on responses as well for both status code and content-type
    return {
      contentType: "application/json",
      statusCode: "400",
      headers: {
        "x-foo": "bar",
      },
    } as const;
  }));
```

### Local Server

You can start a locally running http server using the included `startLocalServer` function.
This is useful for testing your routes without having to deploy code.

**Exmaple**

```typescript
// Provide a chain that accepts and unparsed http event and returns a serialized http response
startLocalServer(openAPIChain(router));
```

### Custom handler chain

Instead of using the default handler chain, you can build the chain yourself and inject middleware anywhere in the process.

```typescript
// Equivalent to the default chain
const handlerChain = nornir<UnparsedHttpEvent>()
  .use(normalizeEventHeaders)
  .use(httpEventParser())
  .use(openAPIRouter.build())
  .useResult(httpErrorHandler())
  .use(httpResponseSerializer());
```

For example, you could add a header to every response

```typescript
const handlerChain = nornir<UnparsedHttpEvent>()
  .use(normalizeEventHeaders)
  .use(httpEventParser())
  .use(openAPIRouter.build())
  .use(input => {
    input.headers["good-request"] = "true";
    return input;
  })
  .useResult(httpErrorHandler())
  .use(httpResponseSerializer());
```

You can use the attachment registry from Nornir to add context data to the request that can be used later

```typescript
const RequestIdKey = AttachmentRegistry.createKey<string>();

const handlerChain = nornir<UnparsedHttpEvent>()
  .use(normalizeEventHeaders)
  .use(httpEventParser())
  .use((req, ctx) => {
    ctx.put(RequestIdKey, randomUUID());
    return req;
  })
  .use(openAPIRouter.build())
  .use((input, ctx) => {
    input.headers["request-id"] = ctx.get(RequestIdKey) || "";
    return input;
  })
  .useResult(httpErrorHandler())
  .use(httpResponseSerializer());
```

### Custom content-type Parsing

You can add custom content type parsing for any of the supported mime types.
A parser takes in a Buffer and returns a parsed object.
Simply provide a content type to parser mapping for the `httpEventParser` middleware.

Mappings provided are provided for `application/json` and `text/plain`.
Default mapping is just to return the buffer as is.

```typescript
const eventParser = httpEventParser({
  [MimeType.ApplicationJson]: (buffer) => JSON.parse(buffer.toString()),
  [MimeType.TextCsv]: (buffer) => buffer.toString().split(","),
});

const handlerChain = nornir<UnparsedHttpEvent>()
  .use(normalizeEventHeaders)
  .use(eventParser)
  .use(openAPIRouter.build())
  .useResult(httpErrorHandler())
  .use(httpResponseSerializer());
```

### Custom Error Handling

You can add custom error mappings for exceptions into http responses.
Construct mappings using `mapErrorClass` and `mapError` and provide them to the `httpErrorHandler` middleware.
Additionally, thrown objects with a `toHttpResponse` method will be automatically converted.

```typescript
const handlerChain = nornir<UnparsedHttpEvent>()
  .use(normalizeEventHeaders)
  .use(openAPIRouter.build())
  .useResult(httpErrorHandler([
    // Maps errors that are an instanceof TestError to a 500 response
    mapErrorClass(TestError, err => ({
      statusCode: HttpStatusCode.InternalServerError,
      headers: {
        "content-type": MimeType.None,
      },
    })),
  ]))
  .use(httpResponseSerializer());
```

### Custom Response Serialization

Custom response serialization can be added by providing a serializer mapping to the `httpResponseSerializer` middleware.
Mappings are provided for `application/json` and `text/plain`, the default for unmapped types in `JSON.stringify`.

```typescript
const handlerChain = nornir<UnparsedHttpEvent>()
  .use(normalizeEventHeaders)
  .use(httpEventParser())
  .use(openAPIRouter.build())
  .useResult(httpErrorHandler())
  .use(httpResponseSerializer({
    // Simple map of content type to serializer
    // Serializer receives the body and produces a buffer
    [MimeType.ApplicationJson]: (body) => Buffer.from(JSON.stringify(body)),
    [MimeType.TextCsv]: (body) => Buffer.from(body.join(",")),
  }));
```
