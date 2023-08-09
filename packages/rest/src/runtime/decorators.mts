import {Nornir} from "@nornir/core";
import {HttpRequest, HttpResponse} from "./http-event.mjs";
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

const routeChainDecorator = <Input extends HttpRequest, Output extends HttpResponse>(
  _target: (chain: Nornir<Input>) => Nornir<Input, Output>,
  _propertyKey: ClassMethodDecoratorContext,
): never => {throw UNTRANSFORMED_ERROR};

/**
 * Use to mark a method as a GET route
 *
 * @originator nornir/rest
 */
export function GetChain(_path: string) {
  return routeChainDecorator;
}

/**
 * Use to mark a method as a POST route
 *
 * @originator nornir/rest
 */
export function PostChain(_path: string) {
  return routeChainDecorator;
}

/**
 * Use to mark a method as a PUT route
 *
 * @originator nornir/rest
 */
export function PutChain(_path: string) {
  return routeChainDecorator;
}

/**
 * Use to mark a method as a PATCH route
 *
 * @originator nornir/rest
 */
export function PatchChain(_path: string) {
  return routeChainDecorator;
}

/**
 * Use to mark a method as a DELETE route
 *
 * @originator nornir/rest
 */
export function DeleteChain(_path: string) {
  return routeChainDecorator;
}

/**
 * Use to mark a method as a HEAD route
 *
 * @originator nornir/rest
 */
export function HeadChain(_path: string) {
  return routeChainDecorator;
}

/**
 * Use to mark a method as a OPTIONS route
 *
 * @originator nornir/rest
 */
export function OptionsChain(_path: string) {
  return routeChainDecorator;
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
