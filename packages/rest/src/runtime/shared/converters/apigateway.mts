import {AttachmentRegistry, nornir, Nornir} from "@nornir/core";
import type {APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2} from "aws-lambda";
import {HttpHeaders, HttpMethod, SerializedHttpResponse, UnparsedHttpEvent} from "../http-event.mjs";
import {OpenAPIRouter} from "../../openapi-router/index.mjs";
import {OpenAPIV3_1} from "../../openapi-router/spec.mjs";
import {ErrorMapping} from "../error.mjs";
import {openAPIChain} from "../../index.mjs";

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

    public static toChain<T extends OpenAPIV3_1.Document>(router: OpenAPIRouter<T>, errorMappings?: ErrorMapping[]): Nornir<APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2> {
        return nornir<APIGatewayProxyEventV2>()
            .use(this.toHttpEvent)
            .useChain(openAPIChain(router, errorMappings))
            .use(this.toResultUnencoded)
    }
}