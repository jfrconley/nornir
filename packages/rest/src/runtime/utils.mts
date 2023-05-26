import {HttpEvent, HttpHeaders, MimeType, UnparsedHttpEvent} from "./http-event.mjs";

export function getContentType(headers: HttpHeaders): MimeType | undefined {
    return (normalizeHeaders(headers))["content-type"] as MimeType
}

export function normalizeEventHeaders<T extends HttpEvent | UnparsedHttpEvent>(event: T): T {
    return {
        ...event,
        headers: normalizeHeaders(event.headers)
    }
}

export function normalizeHeaders(headers: HttpHeaders): HttpHeaders {
    const lowercaseHeaders = Object.entries(headers)
        .reduce((acc, [key, value]) => {
            acc[key.toLowerCase()] = value
            return acc
        }, {} as Record<string, string | number>)

    return {
        ...headers,
        ...lowercaseHeaders
    }
}
