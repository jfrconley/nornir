import { Nornir } from './nornir.js';

export type ExtendsObject<T> = T extends object ? T : never;

export type ExhaustiveTag<
  Union extends object,
  Tag extends keyof Union,
> = Union[Tag] extends string | boolean
  ? {
  [Key in `${Union[Tag]}`]: (
    value: Extract<
      Union,
      {
        [K in Tag]: Key extends 'true'
        ? true
        : Key extends 'false'
          ? false
          : Key;
      }
    >,
  ) => any;
} & ExhaustiveFallback
  : never;

export type ExhaustiveNornirTag<
  Union extends object,
  Tag extends keyof Union,
> = Union[Tag] extends string | boolean
  ? {
  [Key in `${Union[Tag]}`]: (
    value: Nornir<Extract<
      Union,
      {
        [K in Tag]: Key extends 'true'
        ? true
        : Key extends 'false'
          ? false
          : Key;
      }
    >>,
  ) => Nornir<Extract<
    Union,
    {
      [K in Tag]: Key extends 'true'
      ? true
      : Key extends 'false'
        ? false
        : Key;
    }
  >, any>;
} : never;

type ExhaustiveFallback = {
  /**
   * Default fallback
   *
   * @description
   * When declared, "exhaustive" will fallback to this callback
   * instead of throwing an unreachable error
   */
  _?: () => any;
};

/**
 * Ensures no extra values are passed to the object
 */
export type ValidateKeys<T, U> = [keyof T] extends [keyof U]
  ? T
  : {
    [Key in keyof U]: Key extends keyof T ? T[Key] : never;
  };

export const corrupt = (unreachable: never): never => {
  const safeStringify = (value: any) => {
    if (typeof value === 'symbol') {
      return value.toString();
    }

    if (typeof value === 'undefined') {
      return 'undefined';
    }

    if (typeof value === 'string') {
      return value;
    }

    try {
      return JSON.stringify(value);
    } catch (e) {
      if (e instanceof TypeError) {
        if (typeof value === 'bigint') {
          return `${value.toString()} (bigint)`;
        }

        return 'circular object';
      }

      throw e;
    }
  };

  throw new TypeError(
    `Internal Error: encountered impossible value "${safeStringify(
      unreachable,
    )}"`,
  );
};
