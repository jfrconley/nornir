export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS";

type Impossible<K extends keyof any> = {
  [P in K]: never;
};
type Exact<T, U extends T = T> = U & Impossible<Exclude<keyof U, keyof T>>;

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
  readonly statusCode: number;
  readonly headers: Record<string, string | number>;
  readonly body: string | number | object;
}
