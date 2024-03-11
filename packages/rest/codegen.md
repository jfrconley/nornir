# CodeGen Router

This is the API for the code generation based router.
It generates route bindings, validators and documentation using the typescript type system using a custom transformer.
This has the advantage of being easier to work with if you aren't starting from an existing OAS Spec.

## Installation

#### Requirements

- typescript >= 5

#### First, install the package

You can use any package manager. I prefer pnpm, but yarn and npm should work fine.

```bash
pnpm add -D @nornir/rest
# OR
yarn add -D @nornir/rest
# OR
npm install -D @nornir/rest
```

#### Next, install ts-patch

```bash
pnpm add -D ts-patch

# You'll want to add this line to your package.json prepare script
pnpm ts-pach install -s
```

#### Lastly, add the plugin configuration to your `tsconfig.json` file

```json
{
  "compilerOptions": {
    "plugins": [
      {
        "transform": "@nornir/rest/transform"
      }
    ],
    // Nornir Rest uses native ES6 decorators, so you'll need to disable experimentalDecorators
    "experimentalDecorators": false
  }
}
```

## Basic Usage

**index.ts**

```typescript
import nornir from "@nornir/core";
import framework, { ApiGatewayProxyV2, startLocalServer } from "@nornir/rest";
import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyHandlerV2,
} from "aws-lambda";
import "./controller.js";

export const handler: APIGatewayProxyHandlerV2 = nornir<
  APIGatewayProxyEventV2
>()
  // Convert the API Gateway event to a Nornir HttpEvent
  .use(ApiGatewayProxyV2.toHttpEvent)
  // We use the default framework chain here, but custom chains can be used
  // as well to inject middleware between the phases of request processing and customize settings
  .useChain(framework())
  // Convert the Nornir HttpResponse to an API Gateway response
  .use(ApiGatewayProxyV2.toResult)
  .build();
```

**controller.ts**

```typescript
interface RoutePutInputJSON extends HttpRequest {
  headers: {
    "content-type": MimeType.ApplicationJson;
  };
  body: RoutePutBodyInput;
}

interface RoutePutBodyInput {
  cool: string;
}

interface PutSuccessResponse extends HttpResponseEmpty {
  statusCode: HttpStatusCode.Created;
}

@Controller("/test")
export class TestController {
  @PutChain("/route")
  public postRoute(
    chain: Nornir<RoutePutInput>,
  ): Nornir<RoutePutInput, PutSuccessResponse> {
    return chain
      .use(() => ({
        statusCode: HttpStatusCode.Created,
        headers: {
          "content-type": MimeType.TextPlain,
        },
      }));
  }
}
```

And you're done! All input validation and route registration is done automatically using a typescript transformer.

### Input Events

The framework functions by taking in an `UnparsedHttpRequest` and returning a `SerializedHttpResponse`.
You can create this event from any source, but the framework provides a few helpers to make this easier.

**Supported Converters**

- ApiGatewayProxyV2
  - Handles api gateway proxy events. Base64 encodes and decodes request and response bodies.

Additionally, a simple local server is provided for testing purposes.

### Handling requests

Requests are processed using methods that return Nornir middleware chains.
Simply create a chain that takes an interface that extends `HttpRequest` and returns an `HttpResponse`.

**Controller Example**

```typescript
// Basepath for the controller
//             |
//             V
@Controller("/test")
export class TestController {
  //   Path for the route
  //            |
  //            V
  @PutChain("/route")
  //         Route base chain           -----Input type----                Response type
  //                |                   |                 |                      |
  //                V                   V                 V                      V
  public postRoute(
    chain: Nornir<RoutePutInput>,
  ): Nornir<RoutePutInput, PutSuccessResponse> {
    return chain
      .use(() => ({
        statusCode: HttpStatusCode.Created,
        headers: {
          "content-type": MimeType.TextPlain,
        },
      }));
  }
}
```

### Input/Output Types

All input and output types must implement the respective `HttpRequest` or `HttpResponse` interface and are automatically validated.
There aren't currently any known unsupported typescript features, but if you find one, please open an issue.

**Input**

```typescript
interface RoutePostInputJSON extends HttpRequest {
  headers: {
    // content-type must always be set to one of the supported mime types
    "content-type": MimeType.ApplicationJson;
  };
  body: RoutePostBodyInput;
}

interface RoutePostBodyInput {
  cool: string;
}

interface RoutePostInputCSV extends HttpRequest {
  headers: {
    "content-type": MimeType.TextCsv;
  };
  body: string;
}

// Discriminated unions and other more complex types are fully supported
type RoutePutInput = RoutePostInputJSON | RoutePostInputCSV;
```

**Output**

```typescript
// Discriminated unions can be used for multiple response types
type PutResponse = PutSuccessResponse | PutBadRequestResponse;

interface PutSuccessResponse extends HttpResponseEmpty {
  // Status code is the only supported property
  statusCode: HttpStatusCode.Created;
}

interface PutBadRequestResponse extends HttpResponse {
  // You can specify multiple status codes to represent different error cases
  statusCode: HttpStatusCode.BadRequest;
  headers: {
    "content-type": MimeType.ApplicationJson;
  };
  body: {
    potato: boolean;
  };
}
```

### Local Server

You can start a locally running http server using the included `startLocalServer` function.
This is useful for testing your routes without having to deploy code.

**Exmaple**

```typescript
import framework, { startLocalServer } from "@nornir/rest";

// Provide a chain that accepts and unparsed http event and returns a serialized http response
// The default framework chain works well here
startWithLocalServer(framework(), 8080);
```

### Custom handler chain

Instead of using the default handler chain, you can build the chain yourself and inject middleware anywhere in the process.

```typescript
// Equivalent to the default chain
const handlerChain = nornir<UnparsedHttpEvent>()
  .use(normalizeEventHeaders)
  .use(httpEventParser())
  .use(router())
  .useResult(httpErrorHandler())
  .use(httpResponseSerializer());
```

For example, you could add a header to every response

```typescript
const handlerChain = nornir<UnparsedHttpEvent>()
  .use(normalizeEventHeaders)
  .use(httpEventParser())
  .use(router())
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
  .use(router())
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
  .use(router())
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
  .use(router())
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
  .use(router())
  .useResult(httpErrorHandler())
  .use(httpResponseSerializer({
    // Simple map of content type to serializer
    // Serializer receives the body and produces a buffer
    [MimeType.ApplicationJson]: (body) => Buffer.from(JSON.stringify(body)),
    [MimeType.TextCsv]: (body) => Buffer.from(body.join(",")),
  }));
```

## Advanced Usage

### Dependency Injection

The framework supports dependency injection using the `@Provider` decorator.
Simply add this decorator to a static method of a controller class that returns an instance of the class.

**Example**

```typescript
@Controller("/test")
export class TestController {
  @Provider()
  public static create() {
    return SomeDiContainer.get(TestController);
  }

  @PutChain("/route")
  public postRoute(chain: Nornir<RoutePutInput>): Nornir<RoutePutInput, PutSuccessResponse> {
  ...
  }
}
```
