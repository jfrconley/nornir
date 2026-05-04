import {AttachmentRegistry, Nornir} from "@nornir/core";
import {HttpHeaders, HttpMethod, SerializedHttpResponse, UnparsedHttpEvent} from "../http-event.mjs";
import {OpenAPIRouter} from "../../openapi-router/index.mjs";
import {OpenAPIV3_1} from "../../openapi-router/spec.mjs";
import {ErrorMapping} from "../error.mjs";
import {createServer} from "node:http";
import {promisify} from "node:util";
import {debugLog} from "../utils.mjs";

export interface Converter<Input, Output> {
    toHttpEvent(event: Input, registry: AttachmentRegistry): UnparsedHttpEvent
    toResult(event: SerializedHttpResponse, registry: AttachmentRegistry): Output
    toChain<T extends OpenAPIV3_1.Document>(router: OpenAPIRouter<T>, errorMappings?: ErrorMapping[]): Nornir<Input, Output>
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

import {Express as ExpressConverter} from "./express.mjs"
import {ApiGatewayProxyV2 as ApiGatewayProxyV2Converter} from "./apigateway.mjs"
import type express from "express";
import {APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2} from "aws-lambda";

export const Express = ExpressConverter satisfies Converter<express.Request, void>
export const ApiGatewayProxyV2 = ApiGatewayProxyV2Converter satisfies Converter<APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2>