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
  private chain: ((input: Result<never>, registry: AttachmentRegistry) => Promise<Result<unknown>>)[] = [];

  public addToChain(handler: (input: Result<never>, registry: AttachmentRegistry) => Promise<Result<unknown>>) {
    this.chain.push(handler);
  }

  public build(baseRegistry?: AttachmentRegistry) {
    return async (...args: unknown[]) => {
      const registry = new AttachmentRegistry();
      if (baseRegistry) {
        registry.merge(baseRegistry);
      }
      let input = Result.ok(args[0]);
      if (!registry.has(InitialArgumentsKey)) {
        registry.put(InitialArgumentsKey, args);
      }
      for (const handler of this.chain) {
        input = await handler(input as never, registry);
      }
      return input.unwrap();
    };
  }

  public buildWithContext() {
    return async (initialInput: Result<unknown>, reg: AttachmentRegistry) => {
      let input = initialInput;
      for (const handler of this.chain) {
        input = await handler(input as never, reg);
      }
      return input;
    };
  }
}

export type ResultMiddleware<Input, Output> = (input: Result<Input>, registry: AttachmentRegistry) => Output;

/**
 * A Nornir is a chain of middleware that can be used to transform an input into an output.
 *
 * @originator nornir/core
 */
export class Nornir<Input, StepInput = Input> {
  constructor(private readonly context: NornirContext = new NornirContext()) {}

  /**
   * Add a middleware to the chain. Takes the result of the previous step and returns an output.
   * Can be used to handle errors.
   */
  public useResult<StepOutput>(handler: ResultMiddleware<StepInput, StepOutput>): Nornir<Input, Awaited<StepOutput>> {
    this.context.addToChain(
      async (input: Result<StepInput>, registry: AttachmentRegistry): Promise<Result<Awaited<StepOutput>>> => {
        try {
          return Result.ok<Awaited<StepOutput>, Error>(await handler(input, registry));
        } catch (error) {
          return Result.err<Error>(error as Error);
        }
      },
    );
    return new Nornir<Input, Awaited<StepOutput>>(this.context);
  }

  /**
   * Add a middleware to the chain. Takes and input and returns an output.
   * Can be either synchronous or asynchronous.
   */
  public use<StepOutput>(
    handler: (input: StepInput, registry: AttachmentRegistry) => StepOutput,
  ): Nornir<Input, Awaited<StepOutput>> {
    this.context.addToChain(
      async (input: Result<StepInput>, registry: AttachmentRegistry): Promise<Result<Awaited<StepOutput>>> => {
        try {
          return Result.ok<Awaited<StepOutput>, Error>(await handler(input.unwrap(), registry));
        } catch (error) {
          return Result.err<Error>(error as Error);
        }
      },
    );
    return new Nornir<Input, Awaited<StepOutput>>(this.context);
  }

  /**
   * Provide a nornir chain to be executed as part of the current chain.
   * Allows you to compose chains together.
   */
  public useChain<StepOutput>(chain: Nornir<StepInput, StepOutput>): Nornir<Input, StepOutput> {
    const builtChain = chain.buildWithContext();
    this.context.addToChain(
      async (input: Result<StepInput>, registry: AttachmentRegistry): Promise<Result<StepOutput>> => {
        try {
          return builtChain(input, registry);
        } catch (error) {
          return Result.err<Error>(error as Error);
        }
      },
    );
    return new Nornir<Input, StepOutput>(this.context);
  }

  /**
   * Splits an array of inputs and processes them through a chain with configurable concurrency.
   * Returns an array of results. Execution will not stop if an item fails, they can all resolve or reject
   * individually.
   */
  public split<
    Item extends ArrayItems<StepInput>,
    ItemResult,
    Output extends Result<ItemResult, Error>[],
  >(
    builder: (chain: Nornir<Item>) => Nornir<Item, ItemResult>,
    concurrency = Number.POSITIVE_INFINITY,
  ): Nornir<Input, Output> {
    const chain = builder(new Nornir<Item>()).buildWithContext();
    this.context.addToChain(async (input: Result<StepInput>, registry: AttachmentRegistry): Promise<Result<Output>> => {
      try {
        const items = input.unwrap() as Item[];
        const results: Result<ItemResult>[] = await concurrentMap(items, async (item) => {
          const result = await chain(Result.ok(item), registry);
          return result.unwrap();
        }, concurrency);
        return Result.ok<Output, Error>(results as Output);
      } catch (error) {
        return Result.err<Error>(error as Error);
      }
    });
    return new Nornir<Input, Output>(this.context);
  }

  /**
   * Pattern match on a property of a discriminated union.
   * Branch is chosen based on the value of the property.
   */
  public match<
    Union extends ExtendsObject<StepInput>,
    Tag extends keyof Union,
    Match extends ExhaustiveNornirTag<Union, Tag> = ExhaustiveNornirTag<Union, Tag>,
    OutputReturns = Match[keyof Match] extends (chain: Nornir<never, never>) => Nornir<never, never>
      ? ReturnType<Match[keyof Match]>
      : never,
    OutputChains extends Nornir<never, never> = OutputReturns extends Nornir<never, never> ? OutputReturns : never,
    Output = JoinNornirChain<OutputChains>,
  >(tag: Tag, match: ValidateKeys<Match, ExhaustiveTag<Union, Tag>>): Nornir<Input, Output> {
    const matcherEntries = Object.entries(match) as [
      keyof Match,
      (chain: Nornir<StepInput, StepInput>) => Nornir<StepInput, unknown>,
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

  /**
   * Build the chain into a function that takes the chain input and produces the chain output.
   */
  public build(baseRegistry?: AttachmentRegistry) {
    return this.context.build(baseRegistry) as (input: Input) => Promise<StepInput>;
  }

  public buildWithContext() {
    return this.context.buildWithContext() as (
      input: Result<Input>,
      registry: AttachmentRegistry,
    ) => Promise<Result<StepInput>>;
  }
}

type JoinNornirChain<Chain extends Nornir<never, never>> = Chain extends Nornir<never, infer Output> ? Output : never;

type ArrayItems<T> = T extends (infer U)[] ? U : never;
