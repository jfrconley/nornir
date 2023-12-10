import {nornir} from "@nornir/core";
import {UnparsedHttpEvent} from './http-event.mjs';
import {normalizeEventHeaders} from "./utils.mjs"
import {httpEventParser} from './parse.mjs'
import {httpResponseSerializer} from './serialize.mjs'

import {Router} from './router.mjs';
import {httpErrorHandler} from "./error.mjs";

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
export {NornirRestRequestError, NornirRestError, httpErrorHandler, mapError, mapErrorClass} from './error.mjs'
export {ApiGatewayProxyV2, startLocalServer} from "./converters.mjs"
export {httpEventParser, HttpBodyParser, HttpBodyParserMap, HttpQueryStringParser} from "./parse.mjs"
export {httpResponseSerializer, HttpBodySerializer, HttpBodySerializerMap} from "./serialize.mjs"
export {normalizeEventHeaders, normalizeHeaders, getContentType} from "./utils.mjs"
export {Router} from "./router.mjs"

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
