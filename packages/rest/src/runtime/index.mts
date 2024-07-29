import {Router} from "./decorator-router/index.mjs";
import {nornir} from "@nornir/core";
import {
    httpErrorHandler,
    httpEventParser,
    httpResponseSerializer,
    normalizeEventHeaders,
    UnparsedHttpEvent
} from "./shared/index.mjs";
import {OpenAPIRouter} from "./openapi-router/index.mjs";

export * from "./shared/index.mjs";
export * from "./openapi-router/index.mjs";
export * from "./decorator-router/index.mjs";


export const router = Router.build

export function restChain() {
    return nornir<UnparsedHttpEvent>()
        .use(normalizeEventHeaders)
        .use(httpEventParser())
        .use(router())
        .useResult(httpErrorHandler())
        .use(httpResponseSerializer())
}

export default restChain;

export function openAPIChain<T>(router: OpenAPIRouter<T>) {
    return nornir<UnparsedHttpEvent>()
        .use(normalizeEventHeaders)
        .use(httpEventParser())
        .use(router.build())
        .useResult(httpErrorHandler())
        .use(httpResponseSerializer())
}
