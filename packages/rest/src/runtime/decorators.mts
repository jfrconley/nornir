import {Nornir} from "@nornir/core";
import {HttpRequest, HttpResponse} from "./http-event.mjs";
import {InstanceOf} from "ts-morph";

const UNTRANSFORMED_ERROR = new Error("@nornir/rest decorators have not been transformed. Have you setup ts-patch/ttypescript and added the transformer to your tsconfig.json?");
export function Controller<const Path extends string, const ApiId extends string>(_basePath: Path, _apiId?: ApiId) {
  return <T extends { new(): unknown }>(_target: T, _ctx: ClassDecoratorContext): T => {
    throw UNTRANSFORMED_ERROR;
  };
}

const routeChainDecorator = <Input extends HttpRequest, Output extends HttpResponse>(
  _target: (chain: Nornir<Input>) => Nornir<Input, Output>,
  _propertyKey: ClassMethodDecoratorContext,
): never => {throw UNTRANSFORMED_ERROR};

export function GetChain(_path: string) {
  return routeChainDecorator;
}

export function PostChain(_path: string) {
  return routeChainDecorator;
}

export function PutChain(_path: string) {
  return routeChainDecorator;
}

export function PatchChain(_path: string) {
  return routeChainDecorator;
}

export function DeleteChain(_path: string) {
  return routeChainDecorator;
}

export function HeadChain(_path: string) {
  return routeChainDecorator;
}

export function OptionsChain(_path: string) {
  return routeChainDecorator;
}

export function Provider() {
  return <T, K extends InstanceOf<T>>(_target: () => K, _propertyKey: ClassMethodDecoratorContext<T> & {static: true}): never => {
    throw UNTRANSFORMED_ERROR
  }
}
