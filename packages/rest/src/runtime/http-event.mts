export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS";

export type HttpEvent = Omit<IHttpRequest, "pathParams">

export interface IHttpRequest {
  readonly method: HttpMethod;
  readonly path: string;
  readonly headers: Record<string, string | number>;

  readonly query: Record<string, string | number | Array<string> | Array<number>>;

  readonly body?: string | number | object;

  readonly pathParams: Record<string, string | number>;
}

export interface IHttpResponse {
  readonly statusCode: number;
  readonly headers: Record<string, string | number>;
  readonly body: string | number | object;
}
