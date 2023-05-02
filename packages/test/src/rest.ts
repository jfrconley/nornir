import { nornir, Result } from "@nornir/core";
import router, { HttpEvent } from "@nornir/rest";
import "./controller.js";
import "./controller2.js";
import { NornirRestRequestValidationError } from "@nornir/rest";

export const handler = nornir<HttpEvent>()
  .use(router())
  .useResult(result =>
    result.chain(input => Result.ok(input), error => {
      if (error instanceof NornirRestRequestValidationError) {
        return Result.ok({
          statusCode: "422" as const,
          body: error.errors,
          headers: {},
        });
      }
      return Result.err(error);
    }).unwrap()
  )
  .build();

console.log(
  await handler({
    method: "PUT",
    path: "/basepath/2/route",
    headers: {
      "content-type": "application/json",
    },
    query: {},
    body: {
      cool: "stuff",
    },
  }),
);
