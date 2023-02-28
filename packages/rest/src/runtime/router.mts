import Trouter from 'trouter';
import { RouteHolder, RouteBuilder } from './route-holder.mjs';
import { HttpMethod, HttpEvent, IHttpRequest, IHttpResponse } from './http-event.mjs';
import { Nornir, AttachmentRegistry, Result } from '@nornir/core';
import { assert } from 'typia';

type RouteHandler = (request: Result<IHttpRequest>, registry: AttachmentRegistry) => Promise<Result<IHttpResponse>>;

export class Router {
  private static readonly instance = new Router();

  public static get(): Router {
    return Router.instance;
  }

  private constructor() {
  }

  private readonly router = new Trouter<RouteHandler>();
  private readonly routeHolders: RouteHolder[] = [];
  private readonly routes: { method: HttpMethod, path: string, builder: RouteBuilder }[] = []

  /**
   * @internal
   */
  public register(route: RouteHolder) {
    this.routeHolders.push(route);
  }

  public static build() {
    return Router.get().build();
  }

  public build(): (request: HttpEvent, registry: AttachmentRegistry) => Promise<IHttpResponse> {
    for (const routeHolder of this.routeHolders) {
      this.routes.push(...routeHolder.routes);
    }
    this.routes.forEach(({method, path, builder}) =>
      this.router.add(method, path, builder(new Nornir<IHttpRequest>()).buildWithContext())
    );

    return async (event, registry): Promise<IHttpResponse> => {
      try {
        assert<HttpEvent>(event)
      } catch (_) {
        throw new Error("Router was given an invalid IHttpEvent")
      }
      const {params, handlers: [handler]} = this.router.find(event.method, event.path);
      if (handler == null) {
        throw new Error("")
      }
      const request: IHttpRequest = {
        ...event,
        pathParams: params,
      }
      const response = await handler(Result.ok(request), registry);
      return response.unwrap();
    }
  }
}
