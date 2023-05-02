# Nornir - Strongly Typed Middleware Chain for Event Processing in Node.js

Nornir is a TypeScript lib that provides a strongly typed middleware chain for event processing in Node.js with a fluent API.
It allows developers to create a chain of middleware functions that execute one after the other, passing a result from one function to the next.

## Installation

You can install Nornir using NPM or Yarn:

```bash
npm install @nornir/core
```

```bash
yarn add @nornir/core
```

## Usage

```typescript
import nornir from "@nornir/core";
import type { ALBEvent, ALBHandler } from "aws-lambda";

interface Event1 {
  type: "Event1";
  data: string;
}

interface Event2 {
  type: "Event2";
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
  .use(input => input[0].unwrap())
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
```

### Methods

All methods

#### use(handler: (input: StepInput, registry: AttachmentRegistry) => StepOutput)

Adds a middleware function to the chain.
The middleware function takes the output of the previous step as an input and returns a new output.
The function can be either synchronous or asynchronous.

```typescript
nornir.use((input: MyStepInputType, registry: AttachmentRegistry) => {
  // Do something with the input
  return input.thing;
});
```

#### useResult(handler: (input: Result<StepInput>, registry: AttachmentRegistry) => StepOutput)

Adds a middleware function to the chain.
Identitical to use, but the input is wrapped in a Result object that allows you to unwrap the value or handle errors.

```typescript
nornir.useResult(
  async (input: Result<MyStepInputType>, registry: AttachmentRegistry) => {
    // Unwrap the input and do something with it
    return input.unwrap();
  },
);
```

#### useChain(chain: Nornir<StepInput, StepOutput>): Nornir<Input, StepOutput>

Adds a Nornir chain to the current chain.
Allows developers to compose multiple Nornir chains.

```typescript
const subChain = new Nornir<MySubChainInputType>()
  .use((input, registry) => {
    // Do something with the input
    return mySubChainOutput;
  });

nornir.useChain(subChain);
```

#### split(builder: (chain: Nornir<Item>) => Nornir<Item, ItemResult>, concurrency: number): Nornir<Input, Output>

Splits an array of inputs and processes them through a chain with configurable concurrency.
Returns an array of result objects.
Execution will not stop if an item fails, they can all resolve or reject individually.

```typescript
nornir.split(chain =>
  chain.use(item => item.property++)
    .use(item => ({ test: item }))
).use(outputs => outputs.map(output => output.unwrap()));
```

#### match(tag: string, match: object): Nornir<Input, Output>

Pattern match on a property of a discriminated union.
Branch is chosen based on the value of the property.
Matching is exhaustive, so all possible values of the property must be handled.

```typescript
interface Event1 {
  type: "Event1";
  data: string;
}

interface Event2 {
  type: "Event2";
  thing: number;
  stuff: {
    other: boolean;
    test: true;
  };
}

type Event = Event1 | Event2;
export const handler = nornir<Event>()
  .match("type", {
    Event1: chain => chain.use(input => input.data),
    Event2: chain => chain,
  });
```
