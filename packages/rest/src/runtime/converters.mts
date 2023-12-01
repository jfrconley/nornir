import {HttpHeaders, HttpMethod, SerializedHttpResponse, UnparsedHttpEvent} from "./http-event.mjs";
import type {APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2} from "aws-lambda"
import {AttachmentRegistry, Nornir} from "@nornir/core";
import {createServer} from 'node:http'
import {promisify} from "node:util"


export abstract class ApiGatewayProxyV2 {
    public static EventKey = AttachmentRegistry.createKey<APIGatewayProxyEventV2>()

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
}
