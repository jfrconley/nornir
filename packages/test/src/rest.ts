import { nornir } from "@nornir/core";
import router, { HttpEvent } from "@nornir/rest";
import "./controller.js";
import "./controller2.js";

export const handler = nornir<HttpEvent>()
  .use(router())
  .build();

await handler({
  method: "POST",
  path: "/basepath/route",
  headers: {
    "content-type": "application/json",
  },
  query: {},
  body: {},
});
