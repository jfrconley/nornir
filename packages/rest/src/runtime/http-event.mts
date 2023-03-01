export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS";

export type HttpEvent = Omit<IHttpRequest, "pathParams"> & {
  method: HttpMethod;
  path: string;
};

export interface IHttpRequest {
  readonly headers: Record<string, string | number>;

  readonly query: Record<string, string | number | Array<string> | Array<number>>;

  readonly body?: unknown;

  readonly pathParams: Record<string, string | number>;
}

export interface IHttpRequestEmpty extends IHttpRequest {
  body: never;
}

export interface IHttpResponse {
  readonly statusCode: HttpStatusCode;
  readonly headers: Record<string, string | number>;
  readonly body?: unknown;
}

export interface IHttpResponseEmpty extends IHttpResponse {
  body?: never;
}

export const HttpStatusCodes = [
  "100" ,
  "101" ,
  "102" ,
  "200" ,
  "201" ,
  "202" ,
  "203" ,
  "204" ,
  "205" ,
  "206" ,
  "207" ,
  "208" ,
  "226" ,
  "300" ,
  "301" ,
  "302" ,
  "303" ,
  "304" ,
  "305" ,
  "306" ,
  "307" ,
  "308" ,
  "400" ,
  "401" ,
  "402" ,
  "403" ,
  "404" ,
  "405" ,
  "406" ,
  "407" ,
  "408" ,
  "409" ,
  "410" ,
  "411" ,
  "412" ,
  "413" ,
  "414" ,
  "415" ,
  "416" ,
  "417" ,
  "418" ,
  "421" ,
  "422" ,
  "423" ,
  "424" ,
  "426" ,
  "428" ,
  "429" ,
  "431" ,
  "451" ,
  "500" ,
  "501" ,
  "502" ,
  "503" ,
  "504" ,
  "505" ,
  "506" ,
  "507" ,
  "508" ,
  "510"] as const;

export type HttpStatusCode = typeof HttpStatusCodes[number];
