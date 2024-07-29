import {HttpHeaders, HttpRequest, HttpResponse, MimeType} from "../shared/http-event.mjs"

export interface OpenAPIHttpRequest extends HttpRequest {
    headers: HttpHeaders,
    contentType?: MimeType,
}

export interface OpenAPIHttpResponse extends HttpResponse {
    headers: HttpHeaders,
    contentType?: MimeType,
}
