import { Result } from './result.js';
import { AttachmentRegistry } from './attachment-registry.js';
import { IDecider } from './decider.js';
import { ISplitter } from './splitter.js';
import { concurrentMap } from './concurrent-worker.js';
import { NornirChoice } from './choice.js';
import { ExhaustiveNornirTag, ExhaustiveTag, ExtendsObject, ValidateKeys } from './exhaustive.js';

export function nornir<Input = never>() {
  return new Nornir<Input>()
}

export const InitialArgumentsKey = AttachmentRegistry.createKey<unknown[]>();

class NornirContext {
  private chain: ((input: Result<unknown>, registry: AttachmentRegistry) => Promise<Result<unknown>>)[] = [];

  public addToChain<T>(handler: (input: Result<any>, registry: AttachmentRegistry) => Promise<Result<unknown>>) {
    this.chain.push(handler);
  }

  public build() {
    return async (...args: unknown[]) => {
      const registry =  new AttachmentRegistry();
      let input = Result.ok(args[0]);
      if (!registry.has(InitialArgumentsKey)) {
        registry.put(InitialArgumentsKey, args)
      }
      for (const handler of this.chain) {
        input = await handler(input, registry);
      }
      return input.unwrap();
    }
  }

  public buildWithContext() {
    return async (initialInput: Result<unknown>, reg: AttachmentRegistry) => {
      let input = initialInput;
      for (const handler of this.chain) {
        input = await handler(input, reg);
      }
      return input.unwrap();
    }
  }
}

export type ResultMiddleware<Input, Output> = ((input: Result<Input>, registry: AttachmentRegistry) => Output);

export class Nornir<Input, StepInput = Input> {
  constructor(private readonly context: NornirContext = new NornirContext()) {}

  public useResult<StepOutput>(handler: ResultMiddleware<StepInput, StepOutput>): Nornir<Input, Awaited<StepOutput>> {
    this.context.addToChain(async (input: Result<StepInput>, registry: AttachmentRegistry): Promise<Result<Awaited<StepOutput>>> => {
      try {
        return Result.ok<Awaited<StepOutput>, Error>(await handler(input, registry));
      } catch (error: any) {
        return Result.err<Error>(error);
      }
    });
    return new Nornir<Input, Awaited<StepOutput>>(this.context);
  }

  public use<StepOutput>(handler: ((input: StepInput) => StepOutput)): Nornir<Input, Awaited<StepOutput>> {
    this.context.addToChain(async (input: Result<StepInput>, registry: AttachmentRegistry): Promise<Result<Awaited<StepOutput>>> => {
      try {
        return Result.ok<Awaited<StepOutput>, Error>(await handler(input.unwrap()));
      } catch (error: any) {
        return Result.err<Error>(error);
      }
    });
    return new Nornir<Input, Awaited<StepOutput>>(this.context);
  }

  public useWithRegistry<StepOutput>(handler: ((input: StepInput, registry: AttachmentRegistry) => StepOutput)): Nornir<Input, Awaited<StepOutput>> {
    this.context.addToChain(async (input: Result<StepInput>, registry: AttachmentRegistry): Promise<Result<Awaited<StepOutput>>> => {
      try {
        return Result.ok<Awaited<StepOutput>, Error>(await handler(input.unwrap(), registry));
      } catch (error: any) {
        return Result.err<Error>(error);
      }
    });
    return new Nornir<Input, Awaited<StepOutput>>(this.context);
  }

  /**
   *
   */
  public decide<RoutingContext, Output, DefaultOutput>(decider: IDecider<RoutingContext, StepInput>, builder: (chain: NornirChoice<RoutingContext, StepInput, StepInput>) => NornirChoice<RoutingContext, StepInput, Output, DefaultOutput>): Nornir<Input, Output | DefaultOutput> {
    const choice = builder(new NornirChoice<RoutingContext, StepInput, Output>(decider));
    if (choice.defaultChoice == null) {
      throw new Error('Decision contexts require a default choice, please specify one using the .default() method.');
    }
    this.context.addToChain(async (input: Result<StepInput>, registry: AttachmentRegistry): Promise<Result<Output | DefaultOutput>> => {
      try {
        const handler = decider.decide(input.unwrap()) || choice.defaultChoice!;
        return Result.ok<Output, Error>(await handler(input, registry));
      } catch (error: any) {
        return Result.err<Error>(error);
      }
    });
    return new Nornir<Input, Output | DefaultOutput>(this.context);
  }

  public constrict<Type extends StepInput = never>(guard: ((input: StepInput) => input is Type)): Nornir<Input, Type> {
    this.context.addToChain(async (input: Result<StepInput>, registry: AttachmentRegistry): Promise<Result<Type>> => {
      try {
        const value = input.unwrap();
        if (guard(value)) {
          return input as Result<Type>;
        }
        return Result.err<Error>(new Error(`Input did not match guard`));
      } catch (error: any) {
        return Result.err<Error>(error);
      }
    });
    return new Nornir<Input, Type>(this.context);
  }

  public is<T = never>(
    validator?: (input: unknown) => input is T
  ): Nornir<Input, T> {
    if (validator == null) {
      throw new Error('A validator function is required');
    }
    this.context.addToChain(async (input: Result<StepInput>, registry: AttachmentRegistry): Promise<Result<T>> => {
      try {
        const value = input.unwrap();
        if (validator(value)) {
          return input as unknown as Result<T>
        }
        return Result.err<Error>(new Error(`Input did not match guard`));
      } catch (error: any) {
        return Result.err<Error>(error);
      }
    });
    return new Nornir<Input, T>(this.context);
  }

  public split<Item, ItemResult, Output>(splitter: ISplitter<StepInput, Item, ItemResult, Output>, builder: (chain: Nornir<Item>) => Nornir<Item, ItemResult>): Nornir<Item, Output> {
    const chain = builder(new Nornir<Item>()).buildWithContext();
    this.context.addToChain(async (input: Result<StepInput>, registry: AttachmentRegistry): Promise<Result<Output>> => {
      try {
        const items = splitter.split(input.unwrap());
        const results = await concurrentMap(items, (item) => {
          return chain(Result.ok(item), registry);
        });
        return Result.ok<Output, Error>(splitter.join(results));
      } catch (error: any) {
        return Result.err<Error>(error);
      }
    });
    return new Nornir<Item, Output>(this.context);
  }

  public match<
    Union extends ExtendsObject<StepInput>,
    Tag extends keyof Union,
    Match extends ExhaustiveNornirTag<Union, Tag> = ExhaustiveNornirTag<Union, Tag>,
    OutputReturns = Match[keyof Match] extends (chain: Nornir<any>) => Nornir<any>
      ? ReturnType<Match[keyof Match]>
      : never,
    OutputChains extends Nornir<any> = OutputReturns extends Nornir<any> ? OutputReturns : never,
    Output = JoinNornirChain<OutputChains>
  >(tag: Tag, match: ValidateKeys<Match, ExhaustiveTag<Union, Tag>>): Nornir<Input, Output> {
    const matcherEntries = Object.entries(match) as [keyof Match, OutputChains][];
    const builtMatchers = matcherEntries.map(([key, value]) => [key, value.buildWithContext()])
    const matcher: {[key in keyof Match]: (input: StepInput, registry: AttachmentRegistry) => Output} = Object.fromEntries(builtMatchers);
    this.context.addToChain(async (input: Result<Union>, registry: AttachmentRegistry): Promise<Result<Output>> => {
      try {
        const value = input.unwrap();
        const tagValue = value[tag] as keyof Match;
        if (tagValue in matcher) {
          return Result.ok(matcher[tagValue](value, registry));
        }
        throw new Error(`No match for tag ${tagValue.toString()}`);
      } catch (error: any) {
        return Result.err<Error>(error);
      }
    })
    return new Nornir<Input, Output>(this.context);
  }

  public build() {
    return this.context.build() as (input: Input) => Promise<StepInput>;
  }

  public buildWithContext() {
    return this.context.buildWithContext() as (input: Result<Input>, registry: AttachmentRegistry) => Promise<StepInput>;
  }
}

type JoinNornirChain<Chain extends Nornir<any, any>> = Chain extends Nornir<any, infer Output> ? Output : never;

// export class NornirBaseError extends Error implements NodeJS.ErrnoException {
//
//   constructor(message: string) {
//     super(message);
//   }
//
//   message: string;
//   name: string;
// }
