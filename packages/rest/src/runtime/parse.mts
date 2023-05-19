import {HttpEvent, MimeType, UnparsedHttpEvent} from "./http-event.mjs";
import querystring from "node:querystring";

import {getContentType} from "./utils.mjs";

export type HttpBodyParser = (body: Buffer) => unknown

export interface HttpBodyParserMap {
    [contentType: MimeType[number] | "default"]: HttpBodyParser
}

export type HttpQueryStringParser = (query: string) => HttpEvent["query"]
const DEFAULT_BODY_PARSERS: HttpBodyParserMap = {
    "application/json": (body) => JSON.parse(body.toString("utf8")),
    "text/plain": (body) => body.toString("utf8"),
    "default": (body) => body
}
const DEFAULT_QUERY_STRING_PARSER: HttpQueryStringParser = querystring.parse as (query: string) => HttpEvent["query"]

export function parseHttpEvent(bodyParserMap?: HttpBodyParserMap, queryStringParser: HttpQueryStringParser = DEFAULT_QUERY_STRING_PARSER) {
    const bodyParsers = {
        ...DEFAULT_BODY_PARSERS,
        ...bodyParserMap
    };
    return (event: UnparsedHttpEvent): HttpEvent => {
        const contentType = getContentType(event.headers) || "default"
        const bodyParser = bodyParsers[contentType];
        return {
            ...event,
            body: bodyParser(event.rawBody),
            query: queryStringParser(event.rawQuery),
        }
    }
}
