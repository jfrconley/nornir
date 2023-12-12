export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS";

export type HttpEvent = Omit<HttpRequest, "pathParams" | "headers"> & {
    headers: HttpHeaders;
    method: HttpMethod;
    path: string;
};

export type UnparsedHttpEvent = Omit<HttpEvent, "body" | "query"> & {
    rawBody: Buffer
    rawQuery: string
}

export type HttpHeadersWithContentType = {
    readonly "content-type": MimeType
} & HttpHeaders;

export type HttpHeadersWithoutContentType = {
    readonly "content-type"?: undefined
} & HttpHeaders


export type HttpHeaders = Record<string, number | string >;

export interface HttpRequest {
    readonly headers: HttpHeadersWithoutContentType | HttpHeadersWithContentType;

    readonly query: QueryParams;

    readonly body?: unknown;

    readonly pathParams: PathParams;
}

type QueryParams = Record<string, string | number | boolean | Array<string> | Array<number>>;

type PathParams = Record<string, string | number>;

export interface HttpRequestEmpty extends HttpRequest {
    headers: HttpHeadersWithoutContentType
    body?: undefined
}

export interface HttpRequestJSON extends HttpRequest {
    body: unknown;
    headers: {
        "content-type": "application/json";
    } & HttpRequest["headers"];
}

export interface HttpResponse {
    readonly statusCode: HttpStatusCode;
    readonly headers: HttpHeadersWithContentType | HttpHeadersWithoutContentType;
    readonly body?: unknown;
}

export interface SerializedHttpResponse extends Omit<HttpResponse, "body"> {
    readonly body: Buffer;
}

export interface HttpResponseEmpty extends HttpResponse {
    readonly body?: undefined
}


export type HttpStatusCode =
    | "100"
    | "101"
    | "102"
    | "200"
    | "201"
    | "202"
    | "203"
    | "204"
    | "205"
    | "206"
    | "207"
    | "208"
    | "226"
    | "300"
    | "301"
    | "302"
    | "303"
    | "304"
    | "305"
    | "307"
    | "308"
    | "400"
    | "401"
    | "402"
    | "403"
    | "404"
    | "405"
    | "406"
    | "407"
    | "408"
    | "409"
    | "410"
    | "411"
    | "412"
    | "413"
    | "414"
    | "415"
    | "416"
    | "417"
    | "418"
    | "421"
    | "422"
    | "423"
    | "424"
    | "426"
    | "428"
    | "429"
    | "431"
    | "451"
    | "500"
    | "501"
    | "502"
    | "503"
    | "504"
    | "505"
    | "506"
    | "507"
    | "508"
    | "510";

export type MimeType =
    | "*/*"
    | "application/json"
    | "application/octet-stream"
    | "application/pdf"
    | "application/x-www-form-urlencoded"
    | "application/zip"
    | "application/gzip"
    | "application/bzip"
    | "application/bzip2"
    | "application/ld+json"
    | "font/woff"
    | "font/woff2"
    | "font/ttf"
    | "font/otf"
    | "audio/mpeg"
    | "audio/x-wav"
    | "image/gif"
    | "image/jpeg"
    | "image/png"
    | "multipart/form-data"
    | "text/css"
    | "text/csv"
    | "text/html"
    | "text/plain"
    | "text/xml"
    | "video/mpeg"
    | "video/mp4"
    | "video/quicktime"
    | "video/x-msvideo"
    | "video/x-flv"
    | "video/webm";
