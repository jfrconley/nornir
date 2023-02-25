/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { Nornir } from "@nornir/core";
import { IHttpRequest, IHttpResponse } from "./http-event.mjs";
import { Router } from "./router.mjs";

const UNTRANSFORMED_ERROR = new Error("@nornir/rest decorators have not been transformed. Have you setup ts-patch/ttypescript and added the transformer to your tsconfig.json?");
export function Route(router: Router, basePath: string) {
  return <T extends { new(): any }>(target: T): T => {
    throw UNTRANSFORMED_ERROR;
  };
}

const routeChainDecorator = <Input extends IHttpRequest, Output extends IHttpResponse>(
  target: any,
  propertyKey: string | symbol,
  descriptor: TypedPropertyDescriptor<(chain: Nornir<Input>) => Nornir<Input, Output>>,
): any => {throw UNTRANSFORMED_ERROR};

export function GetChain(path: string) {
  return routeChainDecorator;
}

export function PostChain(path: string) {
  return routeChainDecorator;
}

export function PutChain(path: string) {
  return routeChainDecorator;
}

export function PatchChain(path: string) {
  return routeChainDecorator;
}

export function DeleteChain(path: string) {
  return routeChainDecorator;
}

export function HeadChain(path: string) {
  return routeChainDecorator;
}

export function OptionsChain(path: string) {
  return routeChainDecorator;
}
