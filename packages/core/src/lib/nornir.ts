/* eslint-disable @typescript-eslint/no-explicit-any */

import { AttachmentRegistry } from "./attachment-registry.js";
import { concurrentMap } from "./concurrent-worker.js";
import { NornirValidationError } from "./error.js";
import { ExhaustiveNornirTag, ExhaustiveTag, ExtendsObject, ValidateKeys } from "./exhaustive.js";
import { Result } from "./result.js";

export function nornir<Input = never>() {
  return new Nornir<Input>();
}

export const InitialArgumentsKey = AttachmentRegistry.createKey<unknown[]>();

class NornirContext {
  private chain: ((input: Result<any>, registry: AttachmentRegistry) => Promise<Result<unknown>>)[] = [];

  public addToChain(handler: (input: Result<any>, registry: AttachmentRegistry) => Promise<Result<unknown>>) {
    this.chain.push(handler);
  }

  public build() {
    return async (...args: unknown[]) => {
      const registry = new AttachmentRegistry();
      let input = Result.ok(args[0]);
      if (!registry.has(InitialArgumentsKey)) {
        registry.put(InitialArgumentsKey, args);
      }
      for (const handler of this.chain) {
        input = await handler(input, registry);
      }
      return input.unwrap();
    };
  }

  public buildWithContext() {
    return async (initialInput: Result<unknown>, reg: AttachmentRegistry) => {
      let input = initialInput;
      for (const handler of this.chain) {
        input = await handler(input, reg);
      }
      return input;
    };
  }
}

export type ResultMiddleware<Input, Output> = (input: Result<Input>, registry: AttachmentRegistry) => Output;

export class Nornir<Input, StepInput = Input> {
  constructor(private readonly context: NornirContext = new NornirContext()) {}

  public useResult<StepOutput>(handler: ResultMiddleware<StepInput, StepOutput>): Nornir<Input, Awaited<StepOutput>> {
    this.context.addToChain(
      async (input: Result<StepInput>, registry: AttachmentRegistry): Promise<Result<Awaited<StepOutput>>> => {
        try {
          return Result.ok<Awaited<StepOutput>, Error>(await handler(input, registry));
        } catch (error: any) {
          return Result.err<Error>(error);
        }
      },
    );
    return new Nornir<Input, Awaited<StepOutput>>(this.context);
  }

  public use<StepOutput>(
    handler: (input: StepInput, registry: AttachmentRegistry) => StepOutput,
  ): Nornir<Input, Awaited<StepOutput>> {
    this.context.addToChain(
      async (input: Result<StepInput>, registry: AttachmentRegistry): Promise<Result<Awaited<StepOutput>>> => {
        try {
          return Result.ok<Awaited<StepOutput>, Error>(await handler(input.unwrap(), registry));
        } catch (error: any) {
          return Result.err<Error>(error);
        }
      },
    );
    return new Nornir<Input, Awaited<StepOutput>>(this.context);
  }

  public useChain<StepOutput>(chain: Nornir<StepInput, StepOutput>): Nornir<Input, StepOutput> {
    const builtChain = chain.buildWithContext();
    this.context.addToChain(
      async (input: Result<StepInput>, registry: AttachmentRegistry): Promise<Result<StepOutput>> => {
        try {
          return builtChain(input, registry);
        } catch (error: any) {
          return Result.err<Error>(error);
        }
      },
    );
    return new Nornir<Input, StepOutput>(this.context);
  }

  public split<
    Item extends ArrayItems<StepInput>,
    ItemResult,
    Output extends Result<ItemResult, Error>[],
  >(builder: (chain: Nornir<Item>) => Nornir<Item, ItemResult>): Nornir<Input, Output> {
    const chain = builder(new Nornir<Item>()).buildWithContext();
    this.context.addToChain(async (input: Result<StepInput>, registry: AttachmentRegistry): Promise<Result<Output>> => {
      try {
        const items = input.unwrap() as Item[];
        const results = await concurrentMap(items, (item) => {
          return chain(Result.ok(item), registry);
        }) as Output;
        return Result.ok<Output, Error>(results);
      } catch (error: any) {
        return Result.err<Error>(error);
      }
    });
    return new Nornir<Input, Output>(this.context);
  }

  public match<
    Union extends ExtendsObject<StepInput>,
    Tag extends keyof Union,
    Match extends ExhaustiveNornirTag<Union, Tag> = ExhaustiveNornirTag<Union, Tag>,
    OutputReturns = Match[keyof Match] extends (chain: Nornir<any, any>) => Nornir<any, any>
      ? ReturnType<Match[keyof Match]>
      : never,
    OutputChains extends Nornir<any, any> = OutputReturns extends Nornir<any, any> ? OutputReturns : never,
    Output = JoinNornirChain<OutputChains>,
  >(tag: Tag, match: ValidateKeys<Match, ExhaustiveTag<Union, Tag>>): Nornir<Input, Output> {
    const matcherEntries = Object.entries(match) as [
      keyof Match,
      (chain: Nornir<StepInput, any>) => Nornir<StepInput, any>,
    ][];
    const builtMatchers = matcherEntries.map((
      [key, value],
    ) => [key, value(new Nornir<StepInput>()).buildWithContext()]);
    const matcher: {
      [key in keyof Match]: (input: Result<StepInput>, registry: AttachmentRegistry) => Result<Output>;
    } = Object.fromEntries(builtMatchers);
    this.context.addToChain(async (input: Result<Union>, registry: AttachmentRegistry): Promise<Result<Output>> => {
      try {
        const value = input.unwrap();
        const tagValue = value[tag] as keyof Match;
        if (tagValue in matcher) {
          return matcher[tagValue](input, registry);
        }
        return Result.err(new NornirValidationError(`No match for tag ${tagValue?.toString()}`));
      } catch (error: unknown) {
        return Result.err<Error>(error as Error);
      }
    });
    return new Nornir<Input, Output>(this.context);
  }

  public build() {
    return this.context.build() as (input: Input) => Promise<StepInput>;
  }

  public buildWithContext() {
    return this.context.buildWithContext() as (
      input: Result<Input>,
      registry: AttachmentRegistry,
    ) => Promise<Result<StepInput>>;
  }
}

type JoinNornirChain<Chain extends Nornir<any, any>> = Chain extends Nornir<any, infer Output> ? Output : never;

type ArrayItems<T> = T extends (infer U)[] ? U : never;
