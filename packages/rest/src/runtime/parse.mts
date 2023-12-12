import {HttpEvent, HttpResponse, MimeType, UnparsedHttpEvent} from "./http-event.mjs";
import querystring from "node:querystring";

import {getContentType} from "./utils.mjs";
import {NornirRestError} from "./error.mjs";

export type HttpBodyParser = (body: Buffer) => unknown

export type HttpBodyParserMap = Partial<Record<MimeType | "default", HttpBodyParser>>

export class NornirRestParseError extends NornirRestError {
    constructor(cause: Error) {
        super("Failed to parse request. Bad content-type or invalid body", cause)
        this.cause = cause;
    }

    public toHttpResponse(): HttpResponse {
        return {
            statusCode: "422",
            headers: {
              "content-type": "text/plain",
            },
            body: this.message
        }
    }
}

export type HttpQueryStringParser = (query: string) => HttpEvent["query"]
const DEFAULT_BODY_PARSERS: HttpBodyParserMap & {"default": HttpBodyParser} = {
    "application/json": (body) => JSON.parse(body.toString("utf8")),
    "text/plain": (body) => body.toString("utf8"),
    "default": (body) => body
}
const DEFAULT_QUERY_STRING_PARSER: HttpQueryStringParser = querystring.parse as (query: string) => HttpEvent["query"]

export function httpEventParser(bodyParserMap?: HttpBodyParserMap, queryStringParser: HttpQueryStringParser = DEFAULT_QUERY_STRING_PARSER) {
    const bodyParsers = {
        ...DEFAULT_BODY_PARSERS,
        ...bodyParserMap
    };
    return (event: UnparsedHttpEvent): HttpEvent => {
        try {
            const contentType = getContentType(event.headers) || "default";
            const bodyParser = bodyParsers[contentType] || bodyParsers["default"];
            return {
                ...event,
                body: bodyParser(event.rawBody),
                query: queryStringParser(event.rawQuery),
            }
        } catch (error) {
            throw new NornirRestParseError(error as Error)
        }
    }
}
