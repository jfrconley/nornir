import {HttpHeaders, HttpMethod, SerializedHttpResponse, UnparsedHttpEvent} from "./http-event.mjs";
import type {APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2} from "aws-lambda"
import {AttachmentKey, AttachmentRegistry, InitialArgumentsKey, Nornir} from "@nornir/core";
import {createServer} from 'node:http'
import {promisify} from "node:util"
import {debugLog} from "./utils.mjs";
import type express from "express"


export abstract class ApiGatewayProxyV2 {
    public static readonly EventKey = AttachmentRegistry.createKey<APIGatewayProxyEventV2>()

    public static toHttpEvent(event: APIGatewayProxyEventV2, registry: AttachmentRegistry): UnparsedHttpEvent {
        registry.put(ApiGatewayProxyV2.EventKey, event)
        return {
            headers: event.headers as HttpHeaders,
            path: event.rawPath,
            method: event.requestContext.http.method as HttpMethod,
            rawQuery: event.rawQueryString,
            rawBody: Buffer.from(event.body || "", event.isBase64Encoded ? "base64" : "utf8")
        }
    }

    public static toResult(event: SerializedHttpResponse): APIGatewayProxyStructuredResultV2 {
        return {
            headers: event.headers,
            body: event.body.toString("base64"),
            isBase64Encoded: true,
            statusCode: +event.statusCode
        }
    }

    public static toResultUnencoded(event: SerializedHttpResponse): APIGatewayProxyStructuredResultV2 {
        return {
            headers: event.headers,
            body: event.body.toString("utf8"),
            isBase64Encoded: false,
            statusCode: +event.statusCode
        }
    }
}

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
}


export async function startLocalServer(chain: Nornir<UnparsedHttpEvent, SerializedHttpResponse>, port = 8080) {
    const handler = chain.build();
    const server = createServer(async (req, res) => {
        const url = new URL(req.url || "", `http://${req.headers.host}`);
        const bodyAcc: Buffer[] = []
        req.on("data", chunk => bodyAcc.push(chunk))
        req.on("end", async () => {
            const body = Buffer.concat(bodyAcc)

            const event: UnparsedHttpEvent = {
                headers: req.headers as HttpHeaders,
                path: url.pathname,
                method: req.method as HttpMethod,
                rawBody: body,
                rawQuery: url.search
            }

            const result = await handler(event)

            res.writeHead(+result.statusCode, result.headers);
            res.write(result.body);
            res.end();
        })
    })
    await (promisify(server.listen.bind(server)) as (port?: number) => void )(port)
    debugLog(`Local server started on port ${port}`)
}