import Trouter from 'trouter';
import {RouteBuilder, RouteHolder} from './route-holder.mjs';
import {HttpEvent, HttpMethod, HttpRequest, HttpResponse, HttpStatusCode} from './http-event.mjs';
import {AttachmentRegistry, Nornir, Result} from '@nornir/core';

type RouteHandler = (request: Result<HttpRequest>, registry: AttachmentRegistry) => Promise<Result<HttpResponse>>;

export class Router {
  private static readonly instance = new Router();

  public static get(): Router {
    return Router.instance;
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

  public build(): (request: HttpEvent, registry: AttachmentRegistry) => Promise<HttpResponse> {
    for (const routeHolder of this.routeHolders) {
      this.routes.push(...routeHolder.routes);
    }
    for (const {method, path, builder} of this.routes) this.router.add(method, path, builder(new Nornir<HttpRequest>()).buildWithContext())
    ;

    return async (event, registry): Promise<HttpResponse> => {
      // eslint-disable-next-line unicorn/no-array-method-this-argument, unicorn/no-array-callback-reference
      const {params, handlers: [handler]} = this.router.find(event.method, event.path);
      if (handler == undefined) {
        return {
          statusCode: HttpStatusCode.NotFound,
          body: "Not Found",
          headers: {}
        }
      }
      const request: HttpRequest = {
        ...event,
        pathParams: params,
      }
      const response = await handler(Result.ok(request), registry);
      return response.unwrap();
    }
  }
}
