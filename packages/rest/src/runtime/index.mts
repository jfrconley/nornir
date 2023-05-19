import {nornir} from "@nornir/core";

export {
    GetChain, Controller, PostChain, DeleteChain, HeadChain, OptionsChain, PatchChain, PutChain,
    Provider
} from './decorators.mjs';
export {
    HttpResponse, HttpRequest, HttpEvent, HttpMethod, HttpRequestEmpty, HttpResponseEmpty,
    HttpStatusCode, HttpRequestJSON, HttpHeaders, MimeType,
    UnparsedHttpEvent, SerializedHttpResponse
} from './http-event.mjs';
export {RouteHolder, NornirRestRequestValidationError} from './route-holder.mjs'
export {NornirRestRequestError, NornirRestError} from './error.mjs'
export {ApiGatewayProxyV2, startLocalServer} from "./converters.mjs"
export {parseHttpEvent, HttpBodyParser, HttpBodyParserMap, HttpQueryStringParser} from "./parse.mjs"
export {serializeHttpResponse, HttpBodySerializer, HttpBodySerializerMap} from "./serialize.mjs"
export {normalizeEventHeaders, normalizeHeaders, getContentType} from "./utils.mjs"
export {Router} from "./router.mjs"

import {UnparsedHttpEvent} from './http-event.mjs';
import {normalizeEventHeaders} from "./utils.mjs"
import {parseHttpEvent} from './parse.mjs'
import {serializeHttpResponse} from './serialize.mjs'

import {Router} from './router.mjs';
export const router = Router.build

export function restChain() {
    return nornir<UnparsedHttpEvent>()
        .use(normalizeEventHeaders)
        .use(parseHttpEvent())
        .use(router())
        .use(serializeHttpResponse())
}

export default restChain;
