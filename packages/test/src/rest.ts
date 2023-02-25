import { nornir } from "@nornir/core";
import Router, { HttpEvent } from "@nornir/rest";

export const router = new Router();
export const handler = nornir<HttpEvent>()
  .use(router.build())
  .build();
