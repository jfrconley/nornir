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

/**
 * @ignore
 */
export enum HttpStatusCode {
    Continue = "100",
    SwitchingProtocols = "101",
    Processing = "102",
    Ok = "200",
    Created = "201",
    Accepted = "202",
    NonAuthoritativeInformation = "203",
    NoContent = "204",
    ResetContent = "205",
    PartialContent = "206",
    MultiStatus = "207",
    AlreadyReported = "208",
    IMUsed = "226",
    MultipleChoices = "300",
    MovedPermanently = "301",
    Found = "302",
    SeeOther = "303",
    NotModified = "304",
    UseProxy = "305",
    TemporaryRedirect = "307",
    PermanentRedirect = "308",
    BadRequest = "400",
    Unauthorized = "401",
    PaymentRequired = "402",
    Forbidden = "403",
    NotFound = "404",
    MethodNotAllowed = "405",
    NotAcceptable = "406",
    ProxyAuthenticationRequired = "407",
    RequestTimeout = "408",
    Conflict = "409",
    Gone = "410",
    LengthRequired = "411",
    PreconditionFailed = "412",
    PayloadTooLarge = "413",
    RequestURITooLong = "414",
    UnsupportedMediaType = "415",
    RequestedRangeNotSatisfiable = "416",
    ExpectationFailed = "417",
    ImATeapot = "418",
    MisdirectedRequest = "421",
    UnprocessableEntity = "422",
    Locked = "423",
    FailedDependency = "424",
    UpgradeRequired = "426",
    PreconditionRequired = "428",
    TooManyRequests = "429",
    RequestHeaderFieldsTooLarge = "431",
    UnavailableForLegalReasons = "451",
    InternalServerError = "500",
    NotImplemented = "501",
    BadGateway = "502",
    ServiceUnavailable = "503",
    GatewayTimeout = "504",
    HTTPVersionNotSupported = "505",
    VariantAlsoNegotiates = "506",
    InsufficientStorage = "507",
    LoopDetected = "508",
    NotExtended = "510",
}

/**
 * @ignore
 */
export enum MimeType {
    /**
     * @ignore
     */
    None = "",
    ApplicationJson = "application/json",
    ApplicationOctetStream = "application/octet-stream",
    ApplicationPdf = "application/pdf",
    ApplicationXWwwFormUrlencoded = "application/x-www-form-urlencoded",
    ApplicationZip = "application/zip",
    ApplicationGzip = "application/gzip",
    ApplicationBzip = "application/bzip",
    ApplicationBzip2 = "application/bzip2",
    ApplicationLdJson = "application/ld+json",
    FontWoff = "font/woff",
    FontWoff2 = "font/woff2",
    FontTtf = "font/ttf",
    FontOtf = "font/otf",
    AudioMpeg = "audio/mpeg",
    AudioXWav = "audio/x-wav",
    ImageGif = "image/gif",
    ImageJpeg = "image/jpeg",
    ImagePng = "image/png",
    MultipartFormData = "multipart/form-data",
    TextCss = "text/css",
    TextCsv = "text/csv",
    TextHtml = "text/html",
    TextPlain = "text/plain",
    TextXml = "text/xml",
    VideoMpeg = "video/mpeg",
    VideoMp4 = "video/mp4",
    VideoQuicktime = "video/quicktime",
    VideoXMsVideo = "video/x-msvideo",
    VideoXFlv = "video/x-flv",
    VideoWebm = "video/webm",
}
