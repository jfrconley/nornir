import { Result } from './result.js';

async function doWork<T, K>(iterator: IterableIterator<[number, T]>, mapper: (item: T) => Promise<K>, resultOutput: Result<K>[]) {
  for (const [index, item] of iterator) {
    try {
      resultOutput[index] = Result.ok(await mapper(item));
    } catch (error: any) {
      resultOutput[index] = Result.err(error);
    }
  }
}

export async function concurrentMap<T, K>(items: T[], fn: (item: T) => Promise<K>, concurrency: number = 10) {
  const iterator = items.entries();
  const results: Result<K>[] = new Array(items.length)
  const workers: Promise<void>[] = [];
  for (let i = 0; i < Math.min(concurrency, items.length); i++) {
    workers.push(doWork(iterator, fn, results));
  }
  await Promise.all(workers);
  return results;
}
