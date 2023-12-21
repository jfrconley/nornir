import {HttpResponse, MimeType, SerializedHttpResponse} from "./http-event.mjs";

import {getContentType} from "./utils.mjs";

export type HttpBodySerializer = (body: unknown | undefined) => Buffer

export type HttpBodySerializerMap = Partial<Record<MimeType | "default", HttpBodySerializer>>

const DEFAULT_BODY_SERIALIZERS: HttpBodySerializerMap & {default: HttpBodySerializer} = {
    "application/json": (body) => Buffer.from(JSON.stringify(body) || "", "utf8"),
    "text/plain": (body) => Buffer.from(body?.toString() || "", "utf8"),
    "default": (body) => Buffer.from(JSON.stringify(body) || "", "utf8")
}

export function httpResponseSerializer(bodySerializerMap?: HttpBodySerializerMap) {
    const bodySerializers = {
        ...DEFAULT_BODY_SERIALIZERS,
        ...bodySerializerMap
    };
    return (response: HttpResponse): SerializedHttpResponse => {
        const contentType = getContentType(response.headers) || "default"
        const bodySerializer = bodySerializers[contentType] || bodySerializers["default"]
        return {
            ...response,
            body: bodySerializer(response.body as never)
        }
    }
}
