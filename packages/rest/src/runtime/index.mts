import {Nornir, nornir} from "@nornir/core";
import {
    Express,
    httpErrorHandler,
    httpEventParser,
    httpResponseSerializer,
    normalizeEventHeaders,
    UnparsedHttpEvent
} from "./shared/index.mjs";
import {OpenAPIRouter} from "./openapi-router/index.mjs";
import {ErrorMapping} from "./shared/error.mjs"
import type express from "express"

export * from "./shared/index.mjs";
export * from "./openapi-router/index.mjs";

export function openAPIChain<T>(router: OpenAPIRouter<T>, errorMappings?: ErrorMapping[]) {
    return nornir<UnparsedHttpEvent>()
        .use(normalizeEventHeaders)
        .use(httpEventParser())
        .use(router.build())
        .useResult(httpErrorHandler(errorMappings))
        .use(httpResponseSerializer())
}

export function expressChain<T>(router: OpenAPIRouter<T>, errorMappings?: ErrorMapping[]): Nornir<express.Request, void> {
    return nornir<express.Request>()
        .use(Express.toHttpEvent)
        .useChain(openAPIChain(router, errorMappings))
        .use(Express.toResult)
}

export function expressMiddleware<T>(router: OpenAPIRouter<T>, errorMappings?: ErrorMapping[]): express.RequestHandler {
    const handler = expressChain(router, errorMappings).build() as (
        req: express.Request,
        res: express.Response,
        next: express.NextFunction,
    ) => Promise<void>;
    return (req, res, next) => {
        handler(req, res, next).catch(next);
    };
}
