import { nornir } from "./lib/nornir.js"
import type { ALBEvent, ALBHandler, ALBResult } from 'aws-lambda'
import { IDecider } from './lib/decider.js';
import { AttachmentRegistry } from './lib/attachment-registry.js';

class TestDecider implements IDecider<{ test: string }, ALBEvent> {
  private readonly handlerMap = new Map<string, Function>();
  register(context: { test: string }, handler: Function) {
    this.handlerMap.set(JSON.stringify(context), nornir);
  }
  decide(context: ALBEvent): Function {
    return this.handlerMap.get(JSON.stringify(context))!;
  }
}

interface Event1 {
  type: "Event1",
  data: string;
}

interface Event2 {
  type: "Event2",
  thing: number;
}

type Event = Event1 | Event2;

export const handler: ALBHandler = nornir<ALBEvent>()
  .use(input => ({type: "Event1", data: "Hello World"} as Event))
  .is<Event>()
  .match('type', {
    Event1: chain => chain.use(input => input.data),
    Event2: chain => chain
  })
  .use(input => {
    return {
      statusCode: 200,
      body: JSON.stringify(input)
    }
  })
  .build();

const test = await handler({
  httpMethod: "GET",
  isBase64Encoded: false,
  path: "/",
  body: "",
  requestContext: {
    elb: {
      targetGroupArn: ""
    }
  }
}, {} as any, () => null as any)

console.log(test);
