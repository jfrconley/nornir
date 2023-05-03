import {Nornir} from "@nornir/core";
import {HttpRequest, HttpResponse} from "./http-event.mjs";

const UNTRANSFORMED_ERROR = new Error("@nornir/rest decorators have not been transformed. Have you setup ts-patch/ttypescript and added the transformer to your tsconfig.json?");
export function Controller(_basePath: string) {
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
