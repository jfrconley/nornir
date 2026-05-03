import {AttachmentKey, AttachmentRegistry, InitialArgumentsKey, nornir, Nornir} from "@nornir/core";
import type express from "express";
import {HttpHeaders, HttpMethod, SerializedHttpResponse, UnparsedHttpEvent} from "../http-event.mjs";
import {OpenAPIRouter} from "../../openapi-router/index.mjs";
import {ErrorMapping} from "../error.mjs";
import {openAPIChain} from "../../index.mjs";

export abstract class Express {
    public static readonly ExpressRequestKey: AttachmentKey<express.Request> = AttachmentRegistry.createKey<express.Request>()
    public static readonly ExpressResponseKey: AttachmentKey<express.Response> = AttachmentRegistry.createKey<express.Response>()
    public static readonly ExpressNextKey: AttachmentKey<express.NextFunction> = AttachmentRegistry.createKey<express.NextFunction>()

    public static toHttpEvent(request: express.Request, registry: AttachmentRegistry): UnparsedHttpEvent {
        registry.put(Express.ExpressRequestKey, request)
        // response and next are passed as extra args, which nornir doesn't directly support
        // we can pull them out here from the initial arguments
        const [, response, next] = registry.getAssert(InitialArgumentsKey) as [express.Request, express.Response, express.NextFunction]
        registry.put(Express.ExpressResponseKey, response)
        registry.put(Express.ExpressNextKey, next)

        return {
            method: request.method as HttpMethod,
            path: request.path,
            headers: request.headers as HttpHeaders,
            rawBody: Express.coerceBody(request.body),
            rawQuery: URL.parse(request.originalUrl)?.search ?? ""
        }
    }

    public static toResult(response: SerializedHttpResponse, registry: AttachmentRegistry): void {
        const res = registry.getAssert(Express.ExpressResponseKey)
        res.writeHead(+response.statusCode, response.headers)
        res.end(response.body)
    }

    private static coerceBody(body: unknown): Buffer {
        if (body == null) return Buffer.alloc(0)
        if (Buffer.isBuffer(body)) return body
        if (typeof body === "string") return Buffer.from(body, "utf8")
        return Buffer.from(JSON.stringify(body), "utf8")
    }

    public static toChain<T>(router: OpenAPIRouter<T>, errorMappings?: ErrorMapping[]): Nornir<express.Request, void> {
        return nornir<express.Request>()
            .use(Express.toHttpEvent)
            .useChain(openAPIChain(router, errorMappings))
            .use(Express.toResult)
    }

    public static toMiddleware<T>(router: OpenAPIRouter<T>, errorMappings?: ErrorMapping[]): express.RequestHandler {
        const handler = this.toChain(router, errorMappings).build() as (
            req: express.Request,
            res: express.Response,
            next: express.NextFunction,
        ) => Promise<void>;
        return (req, res, next) => {
            handler(req, res, next).catch(next);
        };
    }
}