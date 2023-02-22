import { IDecider } from './decider.js';
import { Nornir } from './nornir.js';
import { Result } from './result.js';
import { AttachmentRegistry } from './attachment-registry.js';

export class NornirChoice<RoutingContext, Input, Output = never, DefaultOutput = never> {
  /**
   * @internal
   */
  public readonly defaultChoice?: (input: Result<Input>, registry: AttachmentRegistry) => Promise<DefaultOutput>
  constructor(private readonly decider: IDecider<RoutingContext, Input>, defaultChoice?: (input: Result<Input>, registry: AttachmentRegistry) => Promise<DefaultOutput>) {
    this.defaultChoice = defaultChoice;
  }

  public choice<StepOutput>(routing: RoutingContext, builder: (chain: Nornir<Input, Input>) => Nornir<Input, StepOutput>): NornirChoice<RoutingContext, Input, Output | StepOutput, DefaultOutput> {
    this.decider.register(routing, builder(new Nornir<Input, Input>()).buildWithContext());
    return new NornirChoice<RoutingContext, Input, Output | StepOutput, DefaultOutput>(this.decider, this.defaultChoice);
  }

  public default<StepOutput>(builder: (chain: Nornir<Input, Input>) => Nornir<Input, StepOutput>): NornirChoice<RoutingContext, Input, Output, StepOutput> {
    const defaultChoice = builder(new Nornir<Input, Input>()).buildWithContext();
    return new NornirChoice<RoutingContext, Input, Output, StepOutput>(this.decider, defaultChoice);
  }
}
