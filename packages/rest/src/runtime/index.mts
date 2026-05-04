import {nornir} from "@nornir/core";
import {
    httpErrorHandler,
    httpEventParser,
    httpResponseSerializer,
    normalizeEventHeaders,
    UnparsedHttpEvent
} from "./shared/index.mjs";
import {OpenAPIRouter} from "./openapi-router/index.mjs";
import {OpenAPIV3_1} from "./openapi-router/spec.mjs";
import {ErrorMapping} from "./shared/error.mjs"

export * from "./shared/index.mjs";
export * from "./openapi-router/index.mjs";

export function openAPIChain<T extends OpenAPIV3_1.Document>(router: OpenAPIRouter<T>, errorMappings?: ErrorMapping[]) {
    return nornir<UnparsedHttpEvent>()
        .use(normalizeEventHeaders)
        .use(httpEventParser())
        .use(router.build())
        .useResult(httpErrorHandler(errorMappings))
        .use(httpResponseSerializer())
}

