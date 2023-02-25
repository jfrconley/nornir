// import nornir from "@nornir/core";
// import type { ALBEvent, ALBHandler } from "aws-lambda";
// import { validate } from "typia";
//
// interface Event1 {
//   type: "Event1";
//   data: string;
// }
//
// interface Event2 {
//   type: "Event2";
//   /**
//    * @maximum 2
//    */
//   thing: number;
//   stuff: {
//     other: boolean;
//     test: true;
//   };
// }
//
// type Event = Event1 | Event2;
// export const handler: ALBHandler = nornir<ALBEvent>()
//   .use(() => [{ type: "Event2", thing: 3 }])
//   .use((input, reg) => input)
//   .split(
//     chain =>
//       chain
//         .use(input => ({ cool: input.thing }))
//         .use(input => input.cool),
//   )
//   .use(input => validate<Event>(input))
//   .match("success", {
//     true: chain => chain.use(input => input.data),
//     false: chain =>
//       chain.use(input => {
//         throw new Error(JSON.stringify(input.errors));
//       }),
//   })
//   .match("type", {
//     Event1: chain => chain.use(input => input.data),
//     Event2: chain => chain,
//   })
//   .use(input => {
//     return {
//       statusCode: 200,
//       body: JSON.stringify(input),
//     };
//   })
//   .build();
//
// console.log(
//   await handler(
//     { path: "/cool", isBase64Encoded: false, httpMethod: "GET", requestContext: {} as never, body: "" },
//     {} as never,
//     () => undefined,
//   ),
// );
