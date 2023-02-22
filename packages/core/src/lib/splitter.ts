import { Result } from './result.js';

export interface ISplitter<Input, Item, ItemResult, Output> {
  readonly concurrency: number;
  split(input: Input): Item[];

  join(results: Result<ItemResult>[]): Output;
}
