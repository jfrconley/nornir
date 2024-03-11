import {Nornir} from "@nornir/core";
import {HttpRequest, HttpResponse, HttpStatusCode, MimeType} from "./http-event.mjs";
import {InstanceOf} from "ts-morph";

const UNTRANSFORMED_ERROR = new Error("nornir/rest decorators have not been transformed. Have you setup ts-patch/ttypescript and added the originator to your tsconfig.json?");

/**
 * Use to mark a class as a REST controller
 *
 * @originator nornir/rest
 */
export function Controller<const Path extends string, const ApiId extends string>(_basePath: Path, _apiId?: ApiId) {
  return <T extends { new(): unknown }>(_target: T, _ctx: ClassDecoratorContext): T => {
    throw UNTRANSFORMED_ERROR;
  };
}

const routeChainDecorator = <Input extends HttpRequest, Output extends HttpResponse >(
  _target: (chain: Nornir<ValidateRequestType<Input>>) => Nornir<ValidateRequestType<Input>, ValidateResponseType<Output>>,
  _propertyKey: ClassMethodDecoratorContext,
): never => {throw UNTRANSFORMED_ERROR};

export type ValidateRequestType<T extends HttpRequest> = RequestResponseWithBodyHasContentType<T> extends true ? T : "Request type with a body must have a content-type header";
export type ValidateResponseType<T extends HttpResponse> = RequestResponseWithBodyHasContentType<T> extends true ?
    OutputHasSpecifiedStatusCode<T> extends true
        ? T : "Response type must have a status code specified" : "Response type with a body must have a content-type header";

type OutputHasSpecifiedStatusCode<Output extends HttpResponse> = IfEquals<Output["statusCode"], HttpStatusCode, false, true>;

type RequestResponseWithBodyHasContentType<T extends HttpResponse | HttpRequest> =
  // No body spec is valid
  HasBody<T> extends false ? true :
      // Empty body is valid
      T extends { body?: undefined | null } ? true :
      T["headers"]["content-type"] extends string ?
          IfEquals<T["headers"]["content-type"], MimeType | undefined, false, true>
      : false;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type HasBody<T extends HttpResponse | HttpRequest> = T extends { body: any } ? true : false

type Test = { statusCode: HttpStatusCode.Ok, headers: NonNullable<unknown>, body: string}

/**
 * Use to mark a method as a GET route
 *
 * @originator nornir/rest
 *
 */
export function GetChain<const Path extends string>(_path: Path)
    {
  return routeChainDecorator as IfEquals<Path, string, never, typeof routeChainDecorator>;
}

/**
 * Use to mark a method as a POST route
 *
 * @originator nornir/rest
 */
export function PostChain<const Path extends string >(_path: Path) {
  return routeChainDecorator as IfEquals<Path, string, never, typeof routeChainDecorator>;
}

/**
 * Use to mark a method as a PUT route
 *
 * @originator nornir/rest
 */
export function PutChain<const Path extends string >(_path: Path)  {
  return routeChainDecorator as IfEquals<Path, string, never, typeof routeChainDecorator>;
}

/**
 * Use to mark a method as a PATCH route
 *
 * @originator nornir/rest
 */
export function PatchChain<const Path extends string >(_path: Path)  {
  return routeChainDecorator as IfEquals<Path, string, never, typeof routeChainDecorator>;
}

/**
 * Use to mark a method as a DELETE route
 *
 * @originator nornir/rest
 */
export function DeleteChain<const Path extends string >(_path: Path)  {
  return routeChainDecorator as IfEquals<Path, string, never, typeof routeChainDecorator>;
}

/**
 * Use to mark a method as a HEAD route
 *
 * @originator nornir/rest
 */
export function HeadChain<const Path extends string >(_path: Path)  {
  return routeChainDecorator as IfEquals<Path, string, never, typeof routeChainDecorator>;
}

/**
 * Use to mark a method as a OPTIONS route
 *
 * @originator nornir/rest
 */
export function OptionsChain<const Path extends string >(_path: Path)  {
  return routeChainDecorator as IfEquals<Path, string, never, typeof routeChainDecorator>;
}

/**
 * Use to mark a static method as an instance provider for a controller
 *
 * @originator nornir/rest
 */
export function Provider() {
  return <T, K extends InstanceOf<T>>(_target: () => K, _propertyKey: ClassMethodDecoratorContext<T> & {static: true}): never => {
    throw UNTRANSFORMED_ERROR
  }
}

export type IfEquals<T, U, Y = unknown, N = never> = (<G>() => G extends T ? 1 : 2) extends (<G>() => G extends U ? 1 : 2) ? Y
    : N;
