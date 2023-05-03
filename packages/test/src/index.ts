import nornir from "@nornir/core";
import type { ALBEvent, ALBHandler } from "aws-lambda";

interface Event1 {
  type: "Event1";
  data: string;
}

interface Event2 {
  type: "Event2";
  /**
   * @maximum 2
   */
  thing: number;
  stuff: {
    other: boolean;
    test: true;
  };
}

type Event = Event1 | Event2;
export const handler: ALBHandler = nornir<ALBEvent>()
  .use(input => [{ type: "Event1", data: input.body } as Event])
  .split(
    chain =>
      chain
        .use(input => ({ cool: input.type, event: input }))
        .use(input => input.event),
  )
  .use(input => {
    console.log(input[0].unwrap());
    return input[0].unwrap();
  })
  .match("type", {
    Event1: chain => chain.use(input => input.data),
    Event2: chain => chain,
  })
  .use(input => {
    return {
      statusCode: 200,
      body: JSON.stringify(input),
    };
  })
  .build();

console.log(
  await handler(
    { path: "/cool", isBase64Encoded: false, httpMethod: "GET", requestContext: {} as never, body: "" },
    {} as never,
    () => console.log("done"),
  ),
);
