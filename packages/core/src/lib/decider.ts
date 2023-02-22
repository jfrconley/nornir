export interface IDecider<RoutingContext, Input> {
  register(context: RoutingContext, handler: Function): void;

  decide(context: Input): Function | undefined;
}
